import { CallHandler, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of, throwError } from 'rxjs';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { OpcoesAuditar } from './auditar.decorator.js';
import { AuditoriaInterceptor } from './auditoria.interceptor.js';
import { AuditoriaService, normalizarIp } from './auditoria.service.js';

function montarService(create = vi.fn().mockResolvedValue({})) {
  const prisma = { logAuditoria: { create } } as unknown as PrismaService;
  return { service: new AuditoriaService(prisma), create };
}

describe('AuditoriaService', () => {
  it('grava usuário, ação, entidade, id e IP', async () => {
    const { service, create } = montarService();
    await service.registrar({ usuarioId: 'u1', acao: 'LOGIN', entidade: 'usuario', entidadeId: 'u1', ipOrigem: '::1' });
    expect(create).toHaveBeenCalledWith({
      data: { usuarioId: 'u1', acao: 'LOGIN', entidade: 'usuario', entidadeId: 'u1', ipOrigem: '::1', detalhes: undefined },
    });
  });

  it('não interrompe a operação se a auditoria falhar', async () => {
    const { service } = montarService(vi.fn().mockRejectedValue(new Error('banco fora')));
    await expect(service.registrar({ acao: 'X', entidade: 'y' })).resolves.toBeUndefined();
  });

  it('dentro de transação, propaga a falha para desfazer a operação', async () => {
    const { service } = montarService();
    const tx = { logAuditoria: { create: vi.fn().mockRejectedValue(new Error('falhou')) } };
    await expect(service.registrarEm(tx as never, { acao: 'X', entidade: 'y' })).rejects.toThrow('falhou');
  });

  it.each([
    ['::ffff:10.0.0.1', '::ffff:10.0.0.1'],
    [' 192.168.0.10 ', '192.168.0.10'],
    ['não é ip', null],
    [undefined, null],
  ])('normaliza IP %s', (entrada, esperado) => {
    expect(normalizarIp(entrada)).toBe(esperado);
  });
});

describe('AuditoriaInterceptor', () => {
  function montar(opcoes: OpcoesAuditar | undefined, req: Record<string, unknown>) {
    const registrar = vi.fn().mockResolvedValue(undefined);
    const reflector = { get: vi.fn().mockReturnValue(opcoes) } as unknown as Reflector;
    const interceptor = new AuditoriaInterceptor(reflector, { registrar } as unknown as AuditoriaService);
    const ctx = {
      getType: () => 'http',
      getHandler: () => () => undefined,
      switchToHttp: () => ({ getRequest: () => ({ ip: '127.0.0.1', params: {}, ...req }) }),
    } as unknown as ExecutionContext;
    return { interceptor, ctx, registrar };
  }
  const handler = (valor: unknown): CallHandler => ({ handle: () => of(valor) });

  it('ignora rotas sem @Auditar', async () => {
    const { interceptor, ctx, registrar } = montar(undefined, {});
    await lastValueFrom(interceptor.intercept(ctx, handler('ok')));
    expect(registrar).not.toHaveBeenCalled();
  });

  it('usa o :id da rota e o usuário autenticado', async () => {
    const { interceptor, ctx, registrar } = montar(
      { acao: 'DESATIVAR_MEDICO', entidade: 'medico' },
      { params: { id: 'm1' }, usuario: { id: 'rep1' } },
    );
    const r = await lastValueFrom(interceptor.intercept(ctx, handler({ ok: true })));
    expect(r).toEqual({ ok: true });
    expect(registrar).toHaveBeenCalledWith({
      usuarioId: 'rep1',
      acao: 'DESATIVAR_MEDICO',
      entidade: 'medico',
      entidadeId: 'm1',
      ipOrigem: '127.0.0.1',
    });
  });

  it('no login, identifica o usuário pela resposta', async () => {
    const { interceptor, ctx, registrar } = montar({ acao: 'LOGIN', entidade: 'usuario' }, {});
    await lastValueFrom(interceptor.intercept(ctx, handler({ accessToken: 't', usuario: { id: 'u9' } })));
    expect(registrar.mock.calls[0][0]).toMatchObject({ usuarioId: 'u9', entidadeId: 'u9' });
  });

  it('registra a falha com status e e-mail, sem a senha, e repassa o erro', async () => {
    const { interceptor, ctx, registrar } = montar(
      { acao: 'LOGIN', entidade: 'usuario', registrarFalha: true },
      { body: { email: ' Ana@X.com ', senha: 'segredo' } },
    );
    const erro = new UnauthorizedException();
    await expect(
      lastValueFrom(interceptor.intercept(ctx, { handle: () => throwError(() => erro) })),
    ).rejects.toBe(erro);
    expect(registrar).toHaveBeenCalledWith(
      expect.objectContaining({ acao: 'LOGIN_FALHA', usuarioId: null, detalhes: { status: 401, email: 'ana@x.com' } }),
    );
    expect(JSON.stringify(registrar.mock.calls)).not.toContain('segredo');
  });

  it('sem registrarFalha, não grava erros', async () => {
    const { interceptor, ctx, registrar } = montar({ acao: 'LOGOUT', entidade: 'usuario' }, {});
    await expect(
      lastValueFrom(interceptor.intercept(ctx, { handle: () => throwError(() => new Error('x')) })),
    ).rejects.toThrow('x');
    expect(registrar).not.toHaveBeenCalled();
  });
});
