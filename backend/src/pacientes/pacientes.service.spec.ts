import { ForbiddenException } from '@nestjs/common';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import { gerarHashSenha } from '../common/senha.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PacientesService } from './pacientes.service.js';

const AGORA = new Date('2026-10-25T15:00:00Z');

async function montar() {
  const prisma = {
    usuario: {
      findUnique: vi.fn().mockResolvedValue({ senhaHash: await gerarHashSenha('SenhaForte1') }),
      update: vi.fn().mockResolvedValue({}),
    },
    agendamento: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    consentimentoLgpd: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    paciente: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  };
  prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma));
  const auditoria = { registrar: vi.fn().mockResolvedValue(undefined) };
  const service = new PacientesService(prisma as unknown as PrismaService, auditoria as unknown as AuditoriaService);
  return { service, prisma, auditoria };
}

describe('PacientesService.excluirDados (RF16)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(AGORA);
  });
  afterEach(() => vi.useRealTimers());

  it('exige a senha da conta', async () => {
    const { service, prisma } = await montar();
    await expect(service.excluirDados('p1', 'Errada123')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.usuario.update).not.toHaveBeenCalled();
  });

  it('anonimiza os dados pessoais, encerra a conta, cancela agendamentos e revoga o consentimento', async () => {
    const { service, prisma, auditoria } = await montar();

    await service.excluirDados('p1', 'SenhaForte1');

    expect(prisma.agendamento.updateMany).toHaveBeenCalledWith({
      where: { pacienteId: 'p1', status: 'AGENDADO' },
      data: { status: 'CANCELADO', canceladoEm: AGORA },
    });
    const { data } = prisma.usuario.update.mock.calls[0][0];
    expect(data).toMatchObject({
      nome: 'Titular removido',
      email: 'removido+p1@hemobridge.invalid',
      cpf: null,
      telefone: null,
      status: 'ENCERRADO',
      versaoSessao: { increment: 1 },
      paciente: { update: { dataNascimento: null, sexo: null } },
    });
    expect(data.senhaHash).toMatch(/^\$argon2id\$/);
    expect(prisma.consentimentoLgpd.updateMany).toHaveBeenCalledWith({
      where: { usuarioId: 'p1', revogadoEm: null },
      data: { revogadoEm: AGORA },
    });
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ acao: 'EXCLUIR_DADOS', entidadeId: 'p1' }),
      prisma,
    );
  });
});

describe('PacientesService.painel (RF04)', () => {
  it('só mostra o tipo sanguíneo depois da ativação e traz o hemocentro de cada doação', async () => {
    const { service, prisma } = await montar();
    const base = {
      dataNascimento: new Date('1990-04-12T00:00:00Z'),
      ativadoEm: null,
      tipoSanguineo: { sigla: 'O+' },
      usuario: { id: 'p1', nome: 'Paulo', email: 'p@x.com', cpf: '52998224725', telefone: null, criadoEm: AGORA },
      doacoes: [
        {
          id: 'd1',
          registradoEm: AGORA,
          compareceu: true,
          doou: false,
          motivoNaoDoacao: 'Hemoglobina baixa',
          hemocentro: { id: 'hA', nome: 'Hemocentro A', cidade: 'Curitiba', estado: 'PR' },
        },
      ],
      agendamentos: [],
    };
    prisma.paciente.findUnique.mockResolvedValueOnce({ ...base, situacao: 'PENDENTE' });

    const pendente = await service.painel('p1');

    expect(pendente).toMatchObject({ situacao: 'PENDENTE', tipoSanguineo: null, cpf: '***.982.247-**' });
    expect(pendente.doacoes[0]).toMatchObject({ resultado: 'NAO_DOOU', hemocentro: { nome: 'Hemocentro A' } });

    prisma.paciente.findUnique.mockResolvedValueOnce({ ...base, situacao: 'ATIVA' });
    expect((await service.painel('p1')).tipoSanguineo).toBe('O+');
  });

  it('informa a regra de intervalo do paciente e a próxima data permitida, pela última doação efetiva', async () => {
    const { service, prisma } = await montar();
    const doacao = (id: string, data: string, doou: boolean) => ({
      id,
      registradoEm: AGORA,
      compareceu: true,
      doou,
      motivoNaoDoacao: doou ? null : 'Hemoglobina baixa',
      hemocentro: { id: 'hA', nome: 'Hemocentro A', cidade: 'Curitiba', estado: 'PR' },
      agendamento: { horario: { data: new Date(`${data}T00:00:00Z`) } },
    });
    prisma.paciente.findUnique.mockResolvedValueOnce({
      dataNascimento: null,
      sexo: 'MASCULINO',
      situacao: 'ATIVA',
      ativadoEm: AGORA,
      tipoSanguineo: { sigla: 'O+' },
      usuario: { id: 'p1', nome: 'Paulo', email: 'p@x.com', cpf: null, telefone: null, criadoEm: AGORA },
      // Mais recente primeiro; a que não foi doação não conta.
      doacoes: [doacao('d2', '2026-09-20', false), doacao('d1', '2026-08-01', true)],
      agendamentos: [],
    });

    const painel = await service.painel('p1');

    expect(painel).toMatchObject({
      sexo: 'MASCULINO',
      regraDoacao: { intervaloDias: 60, limiteAnual: 4 },
      proximaDoacaoPermitida: '2026-09-30',
    });
    expect(painel.doacoes[0]).not.toHaveProperty('agendamento');
  });

  it('com exame alterado só avisa o contato reservado; inapto definitivo não tem próxima data', async () => {
    const { service, prisma } = await montar();
    const exames = {
      pesquisaAnticorpos: 'NEGATIVA',
      hiv: 'NAO_REAGENTE',
      hepatiteB: 'NAO_REAGENTE',
      hepatiteC: 'REAGENTE',
      sifilis: 'NAO_REAGENTE',
      chagas: 'NAO_REAGENTE',
      htlv: 'NAO_REAGENTE',
      malaria: null,
    };
    prisma.paciente.findUnique.mockResolvedValueOnce({
      dataNascimento: null,
      sexo: 'FEMININO',
      situacao: 'ATIVA',
      ativadoEm: AGORA,
      tipoSanguineo: { sigla: 'O+' },
      usuario: { id: 'p1', nome: 'Ana', email: 'a@x.com', cpf: null, telefone: null, criadoEm: AGORA },
      doacoes: [
        {
          id: 'd1',
          registradoEm: AGORA,
          compareceu: true,
          doou: true,
          motivoNaoDoacao: null,
          hemocentro: { id: 'hA', nome: 'Hemocentro A', cidade: 'Curitiba', estado: 'PR' },
          agendamento: { horario: { data: new Date('2026-08-01T00:00:00Z') } },
          pesoKg: 60,
          alturaCm: null,
          pressaoSistolica: 110,
          pressaoDiastolica: 70,
          pulso: 70,
          temperatura: 36.2,
          hemoglobina: 12.8,
          hematocrito: null,
          volumeMl: 450,
          reacoes: null,
          aptidao: 'INAPTO_DEFINITIVO',
          aptoAPartirDe: null,
          exames,
        },
      ],
      agendamentos: [],
    });

    const painel = await service.painel('p1');

    expect(painel).toMatchObject({ inaptoDefinitivo: true, proximaDoacaoPermitida: null });
    expect(painel.doacoes[0]).toMatchObject({ contatoReservado: true, afericoes: { hemoglobina: 12.8 }, aptidao: 'INAPTO_DEFINITIVO' });
    expect(JSON.stringify(painel)).not.toMatch(/REAGENTE|hepatite/i);
  });
});
