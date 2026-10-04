import { BadRequestException, ForbiddenException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { gerarHashSenha, verificarSenha } from '../common/senha.js';
import type { Perfil, SituacaoPaciente } from '../generated/prisma/enums.js';
import { TERMO_RESPONSABILIDADE } from '../lgpd/termo-responsabilidade.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { papelDe, type TokenPayload } from './auth.types.js';
import { LoginDto } from './dto/login.dto.js';
import { PrimeiroAcessoDto } from './dto/primeiro-acesso.dto.js';

// RN07
export const MAX_TENTATIVAS_LOGIN = 5;
export const MINUTOS_BLOQUEIO = 15;

const MENSAGEM_CREDENCIAIS_INVALIDAS = 'E-mail ou senha incorretos';
const MENSAGEM_PROVISORIA_EXPIRADA =
  'Sua senha provisória expirou. Solicite o reenvio a quem criou sua conta.';

interface DadosSessao {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  senhaProvisoria: boolean;
  versaoSessao: number;
  paciente: { situacao: SituacaoPaciente } | null;
}

@Injectable()
export class AuthService {
  // Hash usado quando o e-mail não existe, para o tempo de resposta não revelar
  // quais e-mails têm conta.
  private readonly hashFicticio = gerarHashSenha('hash-ficticio-tempo-constante');

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  // UC05 – Autenticar Usuário
  async login(dto: LoginDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
        status: true,
        senhaHash: true,
        senhaProvisoria: true,
        senhaProvisoriaExpiraEm: true,
        bloqueadoAte: true,
        versaoSessao: true,
        paciente: { select: { situacao: true } },
      },
    });

    // Conta encerrada (RN13) não tem mais acesso: tratada como inexistente.
    if (!usuario || usuario.status === 'ENCERRADO') {
      await verificarSenha(await this.hashFicticio, dto.senha);
      throw new UnauthorizedException(MENSAGEM_CREDENCIAIS_INVALIDAS);
    }

    const agora = new Date();
    if (usuario.bloqueadoAte && usuario.bloqueadoAte > agora) {
      throw this.contaBloqueada(usuario.bloqueadoAte, agora);
    }

    if (!(await verificarSenha(usuario.senhaHash, dto.senha))) {
      const bloqueadoAte = await this.registrarFalha(usuario.id, agora);
      if (bloqueadoAte) throw this.contaBloqueada(bloqueadoAte, agora);
      throw new UnauthorizedException(MENSAGEM_CREDENCIAIS_INVALIDAS);
    }

    // FE03
    if (usuario.status === 'INATIVO') {
      throw new ForbiddenException(
        'Sua conta está desativada. Entre em contato com a instituição ou com a plataforma.',
      );
    }

    // UC07 FE01 / RN15
    if (usuario.senhaProvisoria && this.provisoriaExpirada(usuario.senhaProvisoriaExpiraEm, agora)) {
      throw new ForbiddenException(MENSAGEM_PROVISORIA_EXPIRADA);
    }

    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { tentativasLogin: 0, bloqueadoAte: null },
    });

    return this.emitirSessao(usuario);
  }

  // UC07 – Definir Senha no Primeiro Acesso
  async definirSenhaPrimeiroAcesso(usuarioId: string, dto: PrimeiroAcessoDto, ipOrigem?: string) {
    if (dto.versaoTermo !== TERMO_RESPONSABILIDADE.versao) {
      throw new BadRequestException(
        'A versão do termo de responsabilidade aceita não é a vigente. Recarregue a página e aceite o termo atual.',
      );
    }
    const usuario = await this.prisma.usuario.findUniqueOrThrow({
      where: { id: usuarioId },
      select: { senhaHash: true, senhaProvisoria: true, senhaProvisoriaExpiraEm: true },
    });
    if (!usuario.senhaProvisoria) {
      throw new BadRequestException('A senha desta conta já foi definida.');
    }
    // FE01: o token pode ter sido emitido antes de a senha provisória expirar.
    if (this.provisoriaExpirada(usuario.senhaProvisoriaExpiraEm, new Date())) {
      throw new ForbiddenException(MENSAGEM_PROVISORIA_EXPIRADA);
    }
    // Passo 4: a nova senha não pode ser igual à provisória.
    if (await verificarSenha(usuario.senhaHash, dto.novaSenha)) {
      throw new BadRequestException('A nova senha deve ser diferente da senha provisória.');
    }

    // O filtro senhaProvisoria: true impede que duas requisições concorrentes
    // definam a senha duas vezes.
    const atualizado = await this.prisma.usuario.update({
      where: { id: usuarioId, senhaProvisoria: true },
      data: {
        senhaHash: await gerarHashSenha(dto.novaSenha),
        senhaProvisoria: false,
        senhaProvisoriaExpiraEm: null,
        versaoSessao: { increment: 1 },
        consentimentos: {
          create: {
            versaoTermo: TERMO_RESPONSABILIDADE.versao,
            finalidade: TERMO_RESPONSABILIDADE.finalidade,
            ipOrigem,
          },
        },
      },
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
        senhaProvisoria: true,
        versaoSessao: true,
        paciente: { select: { situacao: true } },
      },
    });

    // Passo 6: segue para o painel com uma sessão nova.
    return this.emitirSessao(atualizado);
  }

  /** UC05 FA01: encerra a sessão invalidando todos os tokens já emitidos. */
  async logout(usuarioId: string) {
    await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: { versaoSessao: { increment: 1 } },
    });
  }

  private async emitirSessao(usuario: DadosSessao) {
    const payload: TokenPayload = {
      sub: usuario.id,
      perfil: usuario.perfil,
      ver: usuario.versaoSessao,
    };
    const accessToken = await this.jwt.signAsync(payload);
    const { exp } = this.jwt.decode<{ exp: number }>(accessToken);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiraEm: new Date(exp * 1000).toISOString(),
      // UC05 passo 5: o frontend direciona para a definição de senha (UC07).
      primeiroAcesso: usuario.senhaProvisoria,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        papel: papelDe(usuario.perfil, usuario.paciente?.situacao),
      },
    };
  }

  /** RN15: sem data de expiração (ex.: administrador inicial), a provisória não expira. */
  private provisoriaExpirada(expiraEm: Date | null, agora: Date): boolean {
    return expiraEm !== null && expiraEm <= agora;
  }

  /** Conta a tentativa inválida; na 5ª consecutiva bloqueia a conta (RN07). */
  private async registrarFalha(usuarioId: string, agora: Date): Promise<Date | null> {
    const { tentativasLogin } = await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: { tentativasLogin: { increment: 1 } },
      select: { tentativasLogin: true },
    });
    if (tentativasLogin < MAX_TENTATIVAS_LOGIN) return null;

    const bloqueadoAte = new Date(agora.getTime() + MINUTOS_BLOQUEIO * 60_000);
    await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: { tentativasLogin: 0, bloqueadoAte },
    });
    return bloqueadoAte;
  }

  // FE02
  private contaBloqueada(bloqueadoAte: Date, agora: Date) {
    const minutos = Math.ceil((bloqueadoAte.getTime() - agora.getTime()) / 60_000);
    return new HttpException(
      {
        statusCode: HttpStatus.LOCKED,
        error: 'Locked',
        message: `Conta bloqueada por excesso de tentativas. Tente novamente em ${minutos} minuto(s).`,
        bloqueadoAte: bloqueadoAte.toISOString(),
      },
      HttpStatus.LOCKED,
    );
  }
}
