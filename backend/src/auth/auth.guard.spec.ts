import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthGuard } from './auth.guard.js';
import { PERFIS_KEY, PRIMEIRO_ACESSO_KEY, PUBLICO_KEY } from './decorators.js';

const jwt = new JwtService({ secret: 'segredo-teste', signOptions: { expiresIn: '1h' } });

const usuarioDb = (alteracao: Record<string, unknown> = {}) => ({
  id: 'u1',
  nome: 'Maria',
  email: 'maria@email.com',
  perfil: 'PACIENTE',
  status: 'ATIVO',
  senhaProvisoria: false,
  paciente: { situacao: 'APROVADO' },
  ...alteracao,
});

function montar(
  metadados: Record<string, unknown> = {},
  usuario: unknown = usuarioDb(),
  authorization?: string,
) {
  const reflector = {
    getAllAndOverride: vi.fn((chave: string) => metadados[chave]),
  } as unknown as Reflector;
  const prisma = { usuario: { findUnique: vi.fn().mockResolvedValue(usuario) } };
  const req: Record<string, unknown> = { headers: { authorization } };
  const ctx = {
    getHandler: () => null,
    getClass: () => null,
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
  const guard = new AuthGuard(reflector, jwt, prisma as unknown as PrismaService);
  return { guard, ctx, req, prisma };
}

const bearer = () => `Bearer ${jwt.sign({ sub: 'u1', perfil: 'PACIENTE' })}`;

describe('AuthGuard', () => {
  it('libera rota pública sem token', async () => {
    const { guard, ctx, prisma } = montar({ [PUBLICO_KEY]: true });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(prisma.usuario.findUnique).not.toHaveBeenCalled();
  });

  it.each([
    ['sem token', undefined],
    ['token inválido', 'Bearer abc.def.ghi'],
    ['esquema diferente de Bearer', 'Basic dXNlcjpzZW5oYQ=='],
    ['token assinado com outro segredo', `Bearer ${new JwtService({ secret: 'outro' }).sign({ sub: 'u1' })}`],
  ])('recusa requisição %s', async (_, authorization) => {
    const { guard, ctx } = montar({}, usuarioDb(), authorization);
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('anexa o usuário autenticado à requisição', async () => {
    const { guard, ctx, req } = montar({}, usuarioDb(), bearer());

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req['usuario']).toEqual({
      id: 'u1',
      nome: 'Maria',
      email: 'maria@email.com',
      perfil: 'PACIENTE',
      papel: 'DOADOR',
      senhaProvisoria: false,
    });
  });

  it.each([
    ['removido', null],
    ['desativado', usuarioDb({ status: 'INATIVO' })],
    ['encerrado', usuarioDb({ status: 'ENCERRADO' })],
  ])('recusa token de usuário %s', async (_, usuario) => {
    const { guard, ctx } = montar({}, usuario, bearer());
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('restringe por perfil', async () => {
    const negado = montar({ [PERFIS_KEY]: ['ADMINISTRADOR'] }, usuarioDb(), bearer());
    await expect(negado.guard.canActivate(negado.ctx)).rejects.toBeInstanceOf(ForbiddenException);

    const permitido = montar({ [PERFIS_KEY]: ['PACIENTE', 'MEDICO'] }, usuarioDb(), bearer());
    await expect(permitido.guard.canActivate(permitido.ctx)).resolves.toBe(true);
  });

  it('com senha provisória, só libera rotas de primeiro acesso', async () => {
    const provisoria = usuarioDb({ senhaProvisoria: true });

    const bloqueada = montar({}, provisoria, bearer());
    await expect(bloqueada.guard.canActivate(bloqueada.ctx)).rejects.toThrow(/primeiro acesso/);

    const liberada = montar({ [PRIMEIRO_ACESSO_KEY]: true }, provisoria, bearer());
    await expect(liberada.guard.canActivate(liberada.ctx)).resolves.toBe(true);
  });
});
