import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Perfil } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SELECAO_INSTITUICAO, instituicaoDesativada, papelDe, type TokenPayload } from './auth.types.js';
import { PERFIS_KEY, PRIMEIRO_ACESSO_KEY, PUBLICO_KEY, type RequestAutenticada,} from './decorators.js';

/**
 * Guard global: toda rota exige token, salvo as marcadas com @Publico().
 * O usuário é recarregado do banco a cada requisição, para que desativação
 * de conta (RN09) e troca de perfil tenham efeito imediato.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const alvos = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(PUBLICO_KEY, alvos)) return true;

    const req = ctx.switchToHttp().getRequest<RequestAutenticada>();
    const token = this.extrairToken(req);
    if (!token) throw new UnauthorizedException('Autenticação necessária');

    let payload: TokenPayload;
    try {
      payload = await this.jwt.verifyAsync<TokenPayload>(token);
    } catch {
      throw new UnauthorizedException('Sessão inválida ou expirada');
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
        status: true,
        senhaProvisoria: true,
        versaoSessao: true,
        paciente: { select: { situacao: true } },
        ...SELECAO_INSTITUICAO,
      },
    });
    // Token emitido antes de troca de senha ou logout não vale mais.
    if (!usuario || usuario.status !== 'ATIVO' || usuario.versaoSessao !== payload.ver) {
      throw new UnauthorizedException('Sessão inválida ou expirada');
    }
    if (instituicaoDesativada(usuario)) {
      throw new UnauthorizedException('A instituição vinculada à sua conta está desativada.');
    }

    if (
      usuario.senhaProvisoria &&
      !this.reflector.getAllAndOverride<boolean>(PRIMEIRO_ACESSO_KEY, alvos)
    ) {
      throw new ForbiddenException('Defina uma nova senha para concluir o primeiro acesso');
    }

    const perfis = this.reflector.getAllAndOverride<Perfil[] | undefined>(PERFIS_KEY, alvos);
    if (perfis && !perfis.includes(usuario.perfil)) {
      throw new ForbiddenException('Acesso não permitido para o seu perfil');
    }

    req.usuario = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
      papel: papelDe(usuario.perfil, usuario.paciente?.situacao),
      senhaProvisoria: usuario.senhaProvisoria,
    };
    return true;
  }

  private extrairToken(req: RequestAutenticada): string | undefined {
    const [tipo, token] = req.headers.authorization?.split(' ') ?? [];
    return tipo === 'Bearer' ? token : undefined;
  }
}
