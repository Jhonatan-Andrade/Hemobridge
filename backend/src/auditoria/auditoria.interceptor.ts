import { CallHandler, ExecutionContext, HttpException, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Observable, catchError, from, mergeMap, throwError } from 'rxjs';
import type { UsuarioAutenticado } from '../auth/auth.types.js';
import { AUDITAR_KEY, type OpcoesAuditar } from './auditar.decorator.js';
import { AuditoriaService } from './auditoria.service.js';

type RequestAuditada = Request & { usuario?: UsuarioAutenticado };

/** Grava em log_auditoria as rotas marcadas com @Auditar() (RNF05). */
@Injectable()
export class AuditoriaInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditoria: AuditoriaService,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const opcoes = this.reflector.get<OpcoesAuditar | undefined>(AUDITAR_KEY, ctx.getHandler());
    if (!opcoes || ctx.getType() !== 'http') return next.handle();

    const req = ctx.switchToHttp().getRequest<RequestAuditada>();

    return next.handle().pipe(
      // Grava antes de responder, para o registro existir quando o cliente receber a resposta.
      mergeMap((resposta) =>
        from(
          this.auditoria
            .registrar({
              usuarioId: req.usuario?.id ?? idDoUsuarioNaResposta(resposta),
              acao: opcoes.acao,
              entidade: opcoes.entidade,
              entidadeId: idDaEntidade(req, resposta),
              ipOrigem: req.ip,
            })
            .then(() => resposta),
        ),
      ),
      catchError((erro: unknown) => {
        if (!opcoes.registrarFalha) return throwError(() => erro);
        return from(
          this.auditoria.registrar({
            usuarioId: req.usuario?.id ?? null,
            acao: `${opcoes.acao}_FALHA`,
            entidade: opcoes.entidade,
            entidadeId: parametroId(req),
            ipOrigem: req.ip,
            detalhes: detalhesDaFalha(req, erro),
          }),
        ).pipe(mergeMap(() => throwError(() => erro)));
      }),
    );
  }
}

function parametroId(req: Request): string | null {
  const id = req.params?.['id'];
  return typeof id === 'string' ? id : null;
}

function idDaEntidade(req: RequestAuditada, resposta: unknown): string | null {
  return parametroId(req) ?? campoId(resposta) ?? idDoUsuarioNaResposta(resposta) ?? req.usuario?.id ?? null;
}

function campoId(valor: unknown): string | null {
  if (valor && typeof valor === 'object' && 'id' in valor && typeof valor.id === 'string') return valor.id;
  return null;
}

// Login: a resposta traz { usuario: { id } }.
function idDoUsuarioNaResposta(resposta: unknown): string | null {
  if (resposta && typeof resposta === 'object' && 'usuario' in resposta) return campoId(resposta.usuario);
  return null;
}

function detalhesDaFalha(req: Request, erro: unknown) {
  const status = erro instanceof HttpException ? erro.getStatus() : 500;
  // Identifica a conta alvo de tentativas de login sem guardar a senha.
  const corpo: unknown = req.body;
  const email =
    corpo && typeof corpo === 'object' && 'email' in corpo && typeof corpo.email === 'string'
      ? corpo.email.trim().toLowerCase().slice(0, 254)
      : undefined;
  return email ? { status, email } : { status };
}
