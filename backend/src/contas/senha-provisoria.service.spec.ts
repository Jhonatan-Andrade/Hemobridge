import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verificarSenha } from '../common/senha.js';
import { isSenhaValida } from '../common/validators.js';
import { EmailService } from '../email/email.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SenhaProvisoriaService, gerarSenhaProvisoria } from './senha-provisoria.service.js';

describe('gerarSenhaProvisoria', () => {
  it('sempre atende à política de senha e não repete', () => {
    const senhas = Array.from({ length: 200 }, gerarSenhaProvisoria);
    expect(senhas.every(isSenhaValida)).toBe(true);
    expect(senhas.every((s) => s.length === 12 && !/[0O1lI]/.test(s))).toBe(true);
    expect(new Set(senhas).size).toBe(senhas.length);
  });
});

describe('SenhaProvisoriaService', () => {
  const AGORA = new Date('2026-10-04T12:00:00Z');

  function montar(usuario: unknown = null, falhaEmail = false) {
    const prisma = {
      usuario: {
        findUnique: vi.fn().mockResolvedValue(usuario),
        update: vi.fn().mockResolvedValue({}),
      },
    };
    const email = {
      enviar: falhaEmail ? vi.fn().mockRejectedValue(new Error('SMTP')) : vi.fn().mockResolvedValue(undefined),
    };
    const service = new SenhaProvisoriaService(
      prisma as unknown as PrismaService,
      email as unknown as EmailService,
      new ConfigService({}),
    );
    return { service, prisma, email };
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(AGORA);
  });
  afterEach(() => vi.useRealTimers());

  it('gera credenciais provisórias válidas por 72 horas (RN15)', async () => {
    const { senha, dados } = await montar().service.gerar();

    expect(dados.senhaProvisoria).toBe(true);
    expect(dados.senhaProvisoriaExpiraEm).toEqual(new Date('2026-10-07T12:00:00Z'));
    expect(await verificarSenha(dados.senhaHash, senha)).toBe(true);
  });

  it('envia a senha por e-mail e informa falha de envio sem lançar erro', async () => {
    const destinatario = { nome: 'Ana Souza', email: 'ana@h.com', perfil: 'REPRESENTANTE' };

    const ok = montar();
    expect(await ok.service.enviar(destinatario, 'Abc123xyzWQ9')).toBe(true);
    expect(ok.email.enviar.mock.calls[0][0].texto).toContain('Abc123xyzWQ9');

    expect(await montar(null, true).service.enviar(destinatario, 'x')).toBe(false);
  });

  it('reenvia: nova senha, invalida sessões e desbloqueia (UC26 FA02)', async () => {
    const { service, prisma } = montar({
      nome: 'Ana', email: 'ana@h.com', perfil: 'REPRESENTANTE', status: 'ATIVO', senhaProvisoria: true,
    });

    const r = await service.reenviar('u1');

    expect(r).toEqual({ senhaProvisoriaEnviada: true, senhaProvisoriaExpiraEm: '2026-10-07T12:00:00.000Z' });
    expect(prisma.usuario.update.mock.calls[0][0].data).toMatchObject({
      senhaProvisoria: true,
      versaoSessao: { increment: 1 },
      tentativasLogin: 0,
      bloqueadoAte: null,
    });
  });

  it.each([
    ['conta já ativada', { status: 'ATIVO', senhaProvisoria: false }],
    ['conta desativada', { status: 'INATIVO', senhaProvisoria: true }],
  ])('não reenvia para %s', async (_, dados) => {
    const { service } = montar({ nome: 'Ana', email: 'a@h.com', perfil: 'MEDICO', ...dados });
    await expect(service.reenviar('u1')).rejects.toBeInstanceOf(BadRequestException);
  });
});
