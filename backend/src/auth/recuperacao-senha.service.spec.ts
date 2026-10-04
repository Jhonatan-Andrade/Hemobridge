import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hashToken } from '../common/token.js';
import { EmailService } from '../email/email.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { MENSAGEM_SOLICITACAO, RecuperacaoSenhaService } from './recuperacao-senha.service.js';

const AGORA = new Date('2026-10-03T12:00:00Z');

function montar(usuario: unknown) {
  const prisma = {
    usuario: {
      findUnique: vi.fn().mockResolvedValue(usuario),
      update: vi.fn().mockResolvedValue({}),
    },
  };
  const email = { enviar: vi.fn().mockResolvedValue(undefined) };
  const config = new ConfigService({ FRONTEND_URL: 'http://front.test' });
  const service = new RecuperacaoSenhaService(
    prisma as unknown as PrismaService,
    email as unknown as EmailService,
    config,
  );
  return { service, prisma, email };
}

const usuarioAtivo = (alteracao: Record<string, unknown> = {}) => ({
  id: 'u1',
  nome: 'Maria da Silva',
  email: 'maria@email.com',
  status: 'ATIVO',
  senhaProvisoria: false,
  ...alteracao,
});

describe('RecuperacaoSenhaService', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(AGORA);
  });
  afterEach(() => vi.useRealTimers());

  describe('solicitar', () => {
    it('grava só o hash do token com validade de 30 min e envia o link por e-mail', async () => {
      const { service, prisma, email } = montar(usuarioAtivo());

      const r = await service.solicitar({ email: 'maria@email.com' });

      expect(r).toEqual({ mensagem: MENSAGEM_SOLICITACAO });
      const { data } = prisma.usuario.update.mock.calls[0][0];
      expect(data.senhaResetExpiraEm).toEqual(new Date('2026-10-03T12:30:00Z'));
      expect(data.senhaResetUsadoEm).toBeNull();

      const mensagem = email.enviar.mock.calls[0][0];
      expect(mensagem.para).toBe('maria@email.com');
      const token = decodeURIComponent(
        /http:\/\/front\.test\/redefinir-senha\?token=([^\s"]+)/.exec(mensagem.texto)![1],
      );
      expect(token).toHaveLength(43);
      expect(data.senhaResetTokenHash).toBe(hashToken(token));
      expect(data.senhaResetTokenHash).not.toContain(token);
    });

    it.each([
      ['e-mail sem conta (FA01)', null],
      ['conta desativada', usuarioAtivo({ status: 'INATIVO' })],
      ['conta encerrada', usuarioAtivo({ status: 'ENCERRADO' })],
      ['conta com senha provisória', usuarioAtivo({ senhaProvisoria: true })],
    ])('não envia nada para %s, mas responde a mesma mensagem', async (_, usuario) => {
      const { service, prisma, email } = montar(usuario);

      expect(await service.solicitar({ email: 'x@email.com' })).toEqual({
        mensagem: MENSAGEM_SOLICITACAO,
      });
      expect(prisma.usuario.update).not.toHaveBeenCalled();
      expect(email.enviar).not.toHaveBeenCalled();
    });

    it('não falha a requisição se o envio do e-mail falhar', async () => {
      const { service, email } = montar(usuarioAtivo());
      email.enviar.mockRejectedValue(new Error('SMTP fora do ar'));

      await expect(service.solicitar({ email: 'maria@email.com' })).resolves.toEqual({
        mensagem: MENSAGEM_SOLICITACAO,
      });
    });
  });

  describe('redefinir', () => {
    const dto = { token: 'token-recebido', novaSenha: 'NovaSenha9', confirmacaoSenha: 'NovaSenha9' };
    const comLink = (expiraEm: string | null, status = 'ATIVO') => ({
      id: 'u1',
      status,
      senhaResetExpiraEm: expiraEm ? new Date(expiraEm) : null,
    });

    it('troca a senha, invalida o link, desbloqueia a conta e encerra as sessões', async () => {
      const { service, prisma } = montar(comLink('2026-10-03T12:10:00Z'));

      await expect(service.redefinir(dto)).resolves.toEqual({
        mensagem: expect.stringMatching(/redefinida/),
      });

      expect(prisma.usuario.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { senhaResetTokenHash: hashToken('token-recebido') } }),
      );
      const { where, data } = prisma.usuario.update.mock.calls[0][0];
      expect(where).toEqual({ id: 'u1', senhaResetTokenHash: hashToken('token-recebido') });
      expect(data).toMatchObject({
        senhaResetTokenHash: null,
        senhaResetExpiraEm: null,
        senhaResetUsadoEm: AGORA,
        tentativasLogin: 0,
        bloqueadoAte: null,
        versaoSessao: { increment: 1 },
      });
      expect(data.senhaHash).toMatch(/^\$argon2id\$/);
    });

    it.each([
      ['inexistente ou já utilizado', null],
      ['expirado', comLink('2026-10-03T11:59:59Z')],
      ['de conta desativada', comLink('2026-10-03T12:10:00Z', 'INATIVO')],
    ])('recusa link %s (FE01)', async (_, usuario) => {
      const { service, prisma } = montar(usuario);

      await expect(service.redefinir(dto)).rejects.toThrow(/não é mais válido/);
      expect(prisma.usuario.update).not.toHaveBeenCalled();
    });

    it('recusa o segundo uso concorrente do mesmo link', async () => {
      const { service, prisma } = montar(comLink('2026-10-03T12:10:00Z'));
      prisma.usuario.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('not found', { code: 'P2025', clientVersion: 'x' }),
      );

      await expect(service.redefinir(dto)).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
