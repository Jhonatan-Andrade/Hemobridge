import { NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { Prisma } from '../generated/prisma/client.js';
import type { AuditoriaService } from '../auditoria/auditoria.service.js';
import type { EmailService } from '../email/email.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { CaixaNotificacoesService } from './caixa-notificacoes.service.js';
import { NecessidadeCriticaService } from './necessidade-critica.service.js';
import { NotificacoesService } from './notificacoes.service.js';

const config = {
  get: (k: string, padrao?: unknown) => ({ FRONTEND_URL: 'https://app.local/', NOTIFICACOES_REENVIO_MINUTOS: 0 })[k] ?? padrao,
} as unknown as ConfigService;

describe('NotificacoesService (HEM-36)', () => {
  function montar(enviar = vi.fn().mockResolvedValue(undefined)) {
    const prisma = {
      notificacao: {
        createManyAndReturn: vi.fn(({ data }) => data.map((_: unknown, i: number) => ({ id: `n${i + 1}` }))),
        findMany: vi.fn().mockResolvedValue([
          { id: 'n1', titulo: 'Exame solicitado', mensagem: 'Envie o resultado.', link: '/meus-exames', usuario: { nome: 'Ana Souza', email: 'ana@x.com' } },
        ]),
        update: vi.fn().mockResolvedValue({}),
      },
    };
    const service = new NotificacoesService(
      prisma as unknown as PrismaService,
      { enviar } as unknown as EmailService,
      config,
    );
    return { service, prisma, enviar };
  }

  it('registra in-app e envia e-mail com link do frontend, gravando email_enviado_em', async () => {
    const { service, prisma, enviar } = montar();
    const ids = await service.notificar({ usuarioId: 'u1', titulo: 'Exame solicitado', mensagem: 'Envie o resultado.', link: '/meus-exames', email: true });

    expect(ids).toEqual(['n1']);
    expect(prisma.notificacao.createManyAndReturn.mock.calls[0][0].data[0]).toMatchObject({ usuarioId: 'u1', emailSolicitado: true });
    expect(enviar).toHaveBeenCalledWith(expect.objectContaining({ para: 'ana@x.com', assunto: 'Hemobridge – Exame solicitado' }));
    expect(enviar.mock.calls[0][0].texto).toContain('https://app.local/meus-exames');
    expect(prisma.notificacao.update.mock.calls[0][0].data).toMatchObject({ emailEnviadoEm: expect.any(Date) });
  });

  it('falha no e-mail mantém a notificação e registra o erro para nova tentativa', async () => {
    const { service, prisma } = montar(vi.fn().mockRejectedValue(new Error('SMTP fora do ar')));
    const r = await service.despacharEmails(['n1']);

    expect(r).toEqual({ enviados: 0, falhas: 1 });
    const dados = prisma.notificacao.update.mock.calls[0][0].data;
    expect(dados).toMatchObject({ emailTentativas: { increment: 1 }, emailUltimoErro: expect.stringContaining('SMTP') });
    expect(dados.emailEnviadoEm).toBeUndefined();
  });

  it('notificação só in-app não busca e-mails pendentes', async () => {
    const { service, prisma, enviar } = montar();
    prisma.notificacao.findMany.mockResolvedValue([]);
    await service.notificar({ usuarioId: 'u1', titulo: 't', mensagem: 'm' });
    expect(prisma.notificacao.createManyAndReturn.mock.calls[0][0].data[0].emailSolicitado).toBe(false);
    expect(enviar).not.toHaveBeenCalled();
  });
});

describe('CaixaNotificacoesService (HEM-37 / UC12)', () => {
  function montar(encontrada: unknown) {
    const prisma = {
      notificacao: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(encontrada),
        count: vi.fn().mockResolvedValue(0),
        updateMany: vi.fn().mockResolvedValue({ count: 4 }),
      },
    };
    return { service: new CaixaNotificacoesService(prisma as unknown as PrismaService), prisma };
  }

  it('lista só as do usuário, da mais recente, e informa quando não há (FE01)', async () => {
    const { service, prisma } = montar(null);
    const r = await service.listar('u1', { pagina: 1, tamanhoPagina: 20 });
    const args = prisma.notificacao.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ usuarioId: 'u1' });
    expect(args.orderBy).toEqual({ enviadaEm: 'desc' });
    expect(r.mensagem).toMatch(/não tem notificações/);
  });

  it('abrir marca como lida', async () => {
    const { service, prisma } = montar({ id: 'n1', titulo: 't', mensagem: 'm', link: null, enviadaEm: new Date(), lidaEm: null });
    const r = await service.abrir('u1', 'n1');
    expect(r.lida).toBe(true);
    expect(prisma.notificacao.updateMany.mock.calls[0][0].where).toEqual({ id: 'n1', usuarioId: 'u1', lidaEm: null });
  });

  it('notificação de outro usuário responde como inexistente', async () => {
    const { service } = montar(null);
    await expect(service.abrir('u1', 'n-de-outro')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('marca todas como lidas (FA01)', async () => {
    const { service } = montar(null);
    expect(await service.marcarTodasComoLidas('u1')).toEqual({ atualizadas: 4, naoLidas: 0 });
  });
});

describe('NecessidadeCriticaService (HEM-38 / UC19)', () => {
  const AGORA = new Date('2026-10-09T15:00:00Z');
  const doador = (id: string, tipo: string, doaPara: string[], extra: Record<string, unknown> = {}) => ({
    usuarioId: id,
    dataNascimento: new Date('1990-01-01T00:00:00Z'),
    sexo: 'MASCULINO',
    pesoKg: new Prisma.Decimal(80),
    doacoes: [] as { dataColeta: Date }[],
    tipoSanguineo: { sigla: tipo, doaPara: doaPara.map((s) => ({ tipoReceptor: { sigla: s } })) },
    ...extra,
  });

  function montar(candidatos: unknown[], totalCompativeis = candidatos.length) {
    const prisma = {
      hospital: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          nome: 'Hospital X',
          endereco: 'Rua A, 1',
          cidade: 'Curitiba',
          estado: 'PR',
          ativo: true,
          necessidades: [
            { id: 'nec-Opos', tipoSanguineo: { sigla: 'O+' } },
            { id: 'nec-Apos', tipoSanguineo: { sigla: 'A+' } },
          ],
        }),
      },
      paciente: { findMany: vi.fn().mockResolvedValue(candidatos), count: vi.fn().mockResolvedValue(totalCompativeis) },
    };
    const notificacoes = { notificar: vi.fn().mockResolvedValue([]) };
    const auditoria = { registrar: vi.fn().mockResolvedValue(undefined) } as unknown as AuditoriaService;
    const service = new NecessidadeCriticaService(prisma as unknown as PrismaService, notificacoes as never, auditoria);
    return { service, prisma, notificacoes, auditoria };
  }

  it('filtra por estado, compatibilidade e janela de 7 dias do mesmo banco (RN05/RN20)', async () => {
    const { service, prisma } = montar([]);
    await service.notificarDoadores('h1', ['O+', 'A+'], AGORA);
    const where = prisma.paciente.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ situacao: 'APROVADO', estado: 'PR' });
    expect(where.tipoSanguineo.doaPara.some.tipoReceptor.sigla.in).toEqual(['O+', 'A+']);
    expect(where.usuario.notificacoes.none).toEqual({
      necessidade: { hospitalId: 'h1' },
      enviadaEm: { gt: new Date('2026-10-02T15:00:00Z') },
    });
  });

  it('avisa só elegíveis, uma vez por doador, com tipos supridos e endereço (PT12)', async () => {
    const { service, notificacoes } = montar(
      [
        doador('d1', 'O-', ['O-', 'O+', 'A-', 'A+']),
        doador('d2', 'O+', ['O+', 'A+']),
        doador('d3', 'O+', ['O+'], { doacoes: [{ dataColeta: new Date('2026-09-20T00:00:00Z') }] }), // intervalo
      ],
      5,
    );
    const r = await service.notificarDoadores('h1', ['O+', 'A+'], AGORA);

    expect(r).toEqual({ doadoresNotificados: 2, inelegiveis: 1, jaNotificadosNaJanela: 2 });
    const avisos = notificacoes.notificar.mock.calls[0][0];
    expect(avisos.map((a: { usuarioId: string }) => a.usuarioId)).toEqual(['d1', 'd2']);
    expect(avisos[0]).toMatchObject({ titulo: 'Necessidade crítica de sangue A+, O+', email: true, necessidadeId: 'nec-Apos' });
    expect(avisos[1]).toMatchObject({ necessidadeId: 'nec-Opos' }); // próprio tipo do doador
    expect(avisos[0].mensagem).toContain('Rua A, 1, Curitiba/PR');
  });

  it('sem doador apto, registra a ocorrência (FE01)', async () => {
    const { service, notificacoes, auditoria } = montar([]);
    const r = await service.notificarDoadores('h1', ['O+'], AGORA);
    expect(r.doadoresNotificados).toBe(0);
    expect(notificacoes.notificar).not.toHaveBeenCalled();
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ acao: 'NOTIFICACAO_CRITICA_SEM_DESTINATARIOS', entidadeId: 'h1' }),
    );
  });
});
