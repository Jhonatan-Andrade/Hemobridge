import { ExecutionContext, SetMetadata, createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';
import type { Perfil } from '../generated/prisma/enums.js';
import type { UsuarioAutenticado } from './auth.types.js';

export const PUBLICO_KEY = 'auth:publico';
export const PERFIS_KEY = 'auth:perfis';
export const PRIMEIRO_ACESSO_KEY = 'auth:primeiro-acesso';

/** Rota acessível sem autenticação (as demais exigem token por padrão). */
export const Publico = () => SetMetadata(PUBLICO_KEY, true);

/** Restringe a rota aos perfis informados (RNF03). */
export const Perfis = (...perfis: Perfil[]) => SetMetadata(PERFIS_KEY, perfis);

/** Permite a rota a contas que ainda usam senha provisória (UC07). */
export const PermitePrimeiroAcesso = () => SetMetadata(PRIMEIRO_ACESSO_KEY, true);

export type RequestAutenticada = Request & { usuario: UsuarioAutenticado };

/** Injeta o usuário autenticado da requisição. */
export const UsuarioAtual = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): UsuarioAutenticado =>
    ctx.switchToHttp().getRequest<RequestAutenticada>().usuario,
);
