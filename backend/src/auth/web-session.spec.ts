import { ForbiddenException } from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  assertCookieOrigin,
  readSessionCookie,
  setSessionCookie,
} from './web-session.js';
describe('sessão web', () => {
  afterEach(() => vi.unstubAllEnvs());
  it('cria cookie protegido em produção', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const cookie = vi.fn(),
      setHeader = vi.fn();
    setSessionCookie(
      { cookie, setHeader } as unknown as Response,
      'token-de-teste',
      '2026-11-01T00:00:00.000Z',
    );
    expect(cookie).toHaveBeenCalledWith(
      '__Host-hb_session',
      'token-de-teste',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
      }),
    );
    expect(setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
  });
  it('extrai apenas o cookie da sessão', () => {
    vi.stubEnv('NODE_ENV', 'test');
    expect(
      readSessionCookie({
        headers: { cookie: 'other=value; hb_session=token-de-teste' },
      } as Request),
    ).toBe('token-de-teste');
  });
  it('recusa alteração com origem ausente ou não autorizada', () => {
    vi.stubEnv('CORS_ORIGENS', 'https://hemobridge.example');
    expect(() =>
      assertCookieOrigin({
        method: 'POST',
        headers: { origin: 'https://outro.example' },
      } as Request),
    ).toThrow(ForbiddenException);
    expect(() =>
      assertCookieOrigin({ method: 'POST', headers: {} } as Request),
    ).toThrow(ForbiddenException);
    expect(() =>
      assertCookieOrigin({
        method: 'POST',
        headers: { origin: 'https://hemobridge.example' },
      } as Request),
    ).not.toThrow();
  });
});
