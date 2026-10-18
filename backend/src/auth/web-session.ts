import { ForbiddenException } from '@nestjs/common';
import type { Request, Response } from 'express';
export const sessionCookieName = () =>
  process.env.NODE_ENV === 'production' ? '__Host-hb_session' : 'hb_session';
export function setSessionCookie(
  res: Response,
  token: string,
  expires: string,
) {
  res.cookie(sessionCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(expires),
  });
  res.setHeader('Cache-Control', 'no-store');
}
export function clearSessionCookie(res?: Response) {
  res?.clearCookie(sessionCookieName(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}
export function readSessionCookie(req: Request): string | undefined {
  return req.headers.cookie
    ?.split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${sessionCookieName()}=`))
    ?.slice(sessionCookieName().length + 1);
}
export function assertCookieOrigin(req: Request) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return;
  const origins = (
    process.env.CORS_ORIGENS ??
    process.env.FRONTEND_URL ??
    'http://localhost:5174'
  )
    .split(',')
    .map((v) => v.trim());
  if (!req.headers.origin || !origins.includes(req.headers.origin))
    throw new ForbiddenException('Origem da requisição não autorizada.');
}
