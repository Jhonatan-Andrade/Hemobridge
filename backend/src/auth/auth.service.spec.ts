import { BadRequestException, ForbiddenException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { gerarHashSenha } from '../common/senha.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';

const AGORA = new Date('2026-10-03T12:00:00Z');
const SENHA = 'SenhaForte1';

async function criarUsuario(alteracao: Record<string, unknown> = {}) {
  return {
    id: 'u1',
    nome: 'Maria',
    email: 'maria@email.com',
    perfil: 'PACIENTE',
    status: 'ATIVO',
    senhaHash: await gerarHashSenha(SENHA),
    senhaProvisoria: false,
    senhaProvisoriaExpiraEm: null,
    bloqueadoAte: null,
    versaoSessao: 3,
    paciente: { situacao: 'PRE_CADASTRADO' },
    ...alteracao,
  };
}

function criarService(usuario: unknown, tentativasAposFalha = 1) {
  const prisma = {
    usuario: {
      findUnique: vi.fn().mockResolvedValue(usuario),
      findUniqueOrThrow: vi.fn().mockResolvedValue(usuario),
      update: vi.fn().mockResolvedValue({ tentativasLogin: tentativasAposFalha }),
    },
  };
  const jwt = new JwtService({ secret: 'segredo-teste', signOptions: { expiresIn: '1h' } });
  return { service: new AuthService(prisma as unknown as PrismaService, jwt), prisma, jwt };
}

const login = (senha = SENHA) => ({ email: 'maria@email.com', senha });

describe('AuthService.login', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(AGORA);
  });
  afterEach(() => vi.useRealTimers());

  it('autentica, zera as tentativas e devolve um token com o perfil', async () => {
    const { service, prisma, jwt } = criarService(await criarUsuario());

    const r = await service.login(login());

    expect(r).toMatchObject({
      tokenType: 'Bearer',
      expiraEm: '2026-10-03T13:00:00.000Z',
      primeiroAcesso: false,
      usuario: { id: 'u1', perfil: 'PACIENTE', papel: 'PACIENTE' },
    });
    expect(jwt.verify(r.accessToken)).toMatchObject({ sub: 'u1', perfil: 'PACIENTE', ver: 3 });
    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { tentativasLogin: 0, bloqueadoAte: null },
    });
  });

  it('identifica o paciente aprovado como DOADOR', async () => {
    const { service } = criarService(await criarUsuario({ paciente: { situacao: 'APROVADO' } }));
    expect((await service.login(login())).usuario.papel).toBe('DOADOR');
  });

  it('usa a mesma mensagem para e-mail inexistente e senha errada (FE01)', async () => {
    const inexistente = criarService(null).service.login(login());
    await expect(inexistente).rejects.toThrow(new UnauthorizedException('E-mail ou senha incorretos'));

    const senhaErrada = criarService(await criarUsuario()).service.login(login('Errada123'));
    await expect(senhaErrada).rejects.toThrow(new UnauthorizedException('E-mail ou senha incorretos'));
  });

  it('trata conta encerrada como inexistente', async () => {
    const { service } = criarService(await criarUsuario({ status: 'ENCERRADO' }));
    await expect(service.login(login())).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('incrementa a contagem a cada senha errada', async () => {
    const { service, prisma } = criarService(await criarUsuario(), 3);

    await expect(service.login(login('Errada123'))).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { tentativasLogin: { increment: 1 } } }),
    );
  });

  it('bloqueia por 15 minutos na 5ª tentativa inválida (RN07)', async () => {
    const { service, prisma } = criarService(await criarUsuario(), 5);

    const erro = await service.login(login('Errada123')).catch((e) => e);

    expect(erro.getStatus()).toBe(HttpStatus.LOCKED);
    expect(erro.getResponse().message).toMatch(/15 minuto/);
    expect(prisma.usuario.update).toHaveBeenLastCalledWith({
      where: { id: 'u1' },
      data: { tentativasLogin: 0, bloqueadoAte: new Date('2026-10-03T12:15:00Z') },
    });
  });

  it('recusa conta bloqueada mesmo com a senha certa, informando o tempo restante (FE02)', async () => {
    const bloqueadoAte = new Date('2026-10-03T12:07:30Z');
    const { service, prisma } = criarService(await criarUsuario({ bloqueadoAte }));

    const erro = await service.login(login()).catch((e) => e);

    expect(erro.getStatus()).toBe(HttpStatus.LOCKED);
    expect(erro.getResponse().message).toMatch(/8 minuto/);
    expect(prisma.usuario.update).not.toHaveBeenCalled();
  });

  it('libera a conta depois que o bloqueio expira', async () => {
    const { service } = criarService(
      await criarUsuario({ bloqueadoAte: new Date('2026-10-03T11:59:59Z') }),
    );
    await expect(service.login(login())).resolves.toBeDefined();
  });

  it('recusa conta desativada só depois de conferir a senha (FE03)', async () => {
    const { service } = criarService(await criarUsuario({ status: 'INATIVO' }));

    await expect(service.login(login('Errada123'))).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(service.login(login())).rejects.toThrow(/desativada/);
  });

  it('sinaliza primeiro acesso para conta com senha provisória válida', async () => {
    const { service } = criarService(
      await criarUsuario({
        perfil: 'MEDICO',
        paciente: null,
        senhaProvisoria: true,
        senhaProvisoriaExpiraEm: new Date('2026-10-05T12:00:00Z'),
      }),
    );
    expect((await service.login(login())).primeiroAcesso).toBe(true);
  });

  it('recusa senha provisória expirada (UC07 FE01)', async () => {
    const { service } = criarService(
      await criarUsuario({
        senhaProvisoria: true,
        senhaProvisoriaExpiraEm: new Date('2026-10-03T11:00:00Z'),
      }),
    );
    await expect(service.login(login())).rejects.toThrow(
      new ForbiddenException('Sua senha provisória expirou. Solicite o reenvio a quem criou sua conta.'),
    );
  });
});

describe('AuthService.definirSenhaPrimeiroAcesso', () => {
  const PROVISORIA = 'Provisoria1';
  const dto = (alteracao: Record<string, unknown> = {}) => ({
    novaSenha: 'NovaSenha9',
    confirmacaoSenha: 'NovaSenha9',
    aceiteTermo: true,
    versaoTermo: '1.0',
    ...alteracao,
  });

  async function montar(alteracao: Record<string, unknown> = {}) {
    const usuario = {
      senhaHash: await gerarHashSenha(PROVISORIA),
      senhaProvisoria: true,
      senhaProvisoriaExpiraEm: new Date('2026-10-05T12:00:00Z'),
      ...alteracao,
    };
    const ctx = criarService(usuario);
    ctx.prisma.usuario.update.mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'm1',
        nome: 'Dr. João',
        email: 'joao@hospital.com',
        perfil: 'MEDICO',
        senhaProvisoria: data.senhaProvisoria,
        versaoSessao: 1,
        paciente: null,
      }),
    );
    return ctx;
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(AGORA);
  });
  afterEach(() => vi.useRealTimers());

  it('grava a nova senha, registra o termo, invalida sessões anteriores e devolve nova sessão', async () => {
    const { service, prisma, jwt } = await montar();

    const r = await service.definirSenhaPrimeiroAcesso('m1', dto(), '10.0.0.1');

    const { where, data } = prisma.usuario.update.mock.calls[0][0];
    expect(where).toEqual({ id: 'm1', senhaProvisoria: true });
    expect(data).toMatchObject({
      senhaProvisoria: false,
      senhaProvisoriaExpiraEm: null,
      versaoSessao: { increment: 1 },
      consentimentos: { create: { versaoTermo: '1.0', ipOrigem: '10.0.0.1' } },
    });
    expect(data.senhaHash).toMatch(/^\$argon2id\$/);
    expect(r.primeiroAcesso).toBe(false);
    expect(jwt.verify(r.accessToken)).toMatchObject({ sub: 'm1', ver: 1 });
  });

  it('recusa nova senha igual à provisória (passo 4)', async () => {
    const { service, prisma } = await montar();
    await expect(
      service.definirSenhaPrimeiroAcesso('m1', dto({ novaSenha: PROVISORIA, confirmacaoSenha: PROVISORIA })),
    ).rejects.toThrow(/diferente da senha provisória/);
    expect(prisma.usuario.update).not.toHaveBeenCalled();
  });

  it('recusa senha provisória expirada (FE01)', async () => {
    const { service } = await montar({ senhaProvisoriaExpiraEm: new Date('2026-10-03T11:00:00Z') });
    await expect(service.definirSenhaPrimeiroAcesso('m1', dto())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('aceita provisória sem data de expiração (administrador inicial)', async () => {
    const { service } = await montar({ senhaProvisoriaExpiraEm: null });
    await expect(service.definirSenhaPrimeiroAcesso('m1', dto())).resolves.toBeDefined();
  });

  it('recusa conta que já definiu a senha', async () => {
    const { service } = await montar({ senhaProvisoria: false });
    await expect(service.definirSenhaPrimeiroAcesso('m1', dto())).rejects.toThrow(/já foi definida/);
  });

  it('recusa versão do termo diferente da vigente', async () => {
    const { service } = await montar();
    await expect(
      service.definirSenhaPrimeiroAcesso('m1', dto({ versaoTermo: '0.9' })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('AuthService.logout', () => {
  it('incrementa a versão da sessão', async () => {
    const { service, prisma } = criarService(null);
    await service.logout('u1');
    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { versaoSessao: { increment: 1 } },
    });
  });
});
