import { ExecutionContext, SetMetadata, createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';
import type { PapelEquipe, Perfil } from '../generated/prisma/enums.js';
import type { MembroDaEquipe, UsuarioAutenticado } from './auth.types.js';

export const PUBLICO_KEY = 'auth:publico';
export const PERFIS_KEY = 'auth:perfis';
export const PAPEIS_KEY = 'auth:papeis';
export const PRIMEIRO_ACESSO_KEY = 'auth:primeiro-acesso';

/** Rota acessível sem autenticação (as demais exigem token por padrão). */
export const Publico = () => SetMetadata(PUBLICO_KEY, true);

/** Restringe a rota aos perfis informados (RNF03). */
export const Perfis = (...perfis: Perfil[]) => SetMetadata(PERFIS_KEY, perfis);

/** Restringe a rota à equipe de hemocentro com um dos papéis informados (RNF03). */
export const Papeis = (...papeis: PapelEquipe[]) => SetMetadata(PAPEIS_KEY, papeis);

/** Permite a rota a contas que ainda usam senha provisória. */
export const PermitePrimeiroAcesso = () => SetMetadata(PRIMEIRO_ACESSO_KEY, true);

export type RequestAutenticada = Request & { usuario: UsuarioAutenticado };

/** Injeta o usuário autenticado da requisição. */
export const UsuarioAtual = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): UsuarioAutenticado =>
    ctx.switchToHttp().getRequest<RequestAutenticada>().usuario,
);

/** Membro da equipe autenticado; use só em rotas protegidas por @Papeis(). */
export const MembroAtual = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): MembroDaEquipe =>
    ctx.switchToHttp().getRequest<RequestAutenticada>().usuario as MembroDaEquipe,
);
