import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { PapelEquipe, Perfil } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SELECAO_EQUIPE, hemocentroDesativado, vinculoDe, type TokenPayload } from './auth.types.js';
import {
  PAPEIS_KEY,
  PERFIS_KEY,
  PRIMEIRO_ACESSO_KEY,
  PUBLICO_KEY,
  type RequestAutenticada,
} from './decorators.js';

/**
 * Guard global: toda rota exige token, salvo as marcadas com @Publico().
 * O usuário é recarregado do banco a cada requisição, para que desativação
 * de conta ou do hemocentro tenha efeito imediato.
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
        ...SELECAO_EQUIPE,
      },
    });
    // Token emitido antes de troca de senha ou logout não vale mais.
    if (!usuario || usuario.status !== 'ATIVO' || usuario.versaoSessao !== payload.ver) {
      throw new UnauthorizedException('Sessão inválida ou expirada');
    }
    if (hemocentroDesativado(usuario)) {
      throw new UnauthorizedException('O hemocentro vinculado à sua conta está desativado.');
    }

    if (
      usuario.senhaProvisoria &&
      !this.reflector.getAllAndOverride<boolean>(PRIMEIRO_ACESSO_KEY, alvos)
    ) {
      throw new ForbiddenException('Defina uma nova senha para concluir o primeiro acesso');
    }

    const vinculo = vinculoDe(usuario);
    const perfis = this.reflector.getAllAndOverride<Perfil[] | undefined>(PERFIS_KEY, alvos);
    const papeis = this.reflector.getAllAndOverride<PapelEquipe[] | undefined>(PAPEIS_KEY, alvos);
    if (
      (perfis && !perfis.includes(usuario.perfil)) ||
      (papeis && (!vinculo.papel || !papeis.includes(vinculo.papel)))
    ) {
      throw new ForbiddenException('Acesso não permitido para o seu perfil');
    }

    req.usuario = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
      ...vinculo,
      senhaProvisoria: usuario.senhaProvisoria,
    };
    return true;
  }

  private extrairToken(req: RequestAutenticada): string | undefined {
    const [tipo, token] = req.headers.authorization?.split(' ') ?? [];
    return tipo === 'Bearer' ? token : undefined;
  }
}
