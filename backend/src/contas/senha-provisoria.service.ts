import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'node:crypto';
import { gerarHashSenha } from '../common/senha.js';
import { EmailService } from '../email/email.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

// RN15
export const HORAS_VALIDADE_SENHA_PROVISORIA = 72;

// Sem caracteres ambíguos (0/O, 1/l/I), para facilitar a digitação.
const MAIUSCULAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const MINUSCULAS = 'abcdefghijkmnopqrstuvwxyz';
const DIGITOS = '23456789';
const TAMANHO_SENHA = 12;

/** Senha aleatória que atende à política da RN06 (maiúscula, minúscula e número). */
export function gerarSenhaProvisoria(): string {
  const sortear = (alfabeto: string) => alfabeto[randomInt(alfabeto.length)];
  const todos = MAIUSCULAS + MINUSCULAS + DIGITOS;
  const caracteres = [sortear(MAIUSCULAS), sortear(MINUSCULAS), sortear(DIGITOS)];
  while (caracteres.length < TAMANHO_SENHA) caracteres.push(sortear(todos));
  // Embaralha (Fisher–Yates) para os obrigatórios não ficarem sempre no início.
  for (let i = caracteres.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [caracteres[i], caracteres[j]] = [caracteres[j], caracteres[i]];
  }
  return caracteres.join('');
}

const NOME_PERFIL: Record<string, string> = {
  MEDICO: 'médico(a)',
  REPRESENTANTE: 'representante de banco de sangue',
  ADMINISTRADOR: 'administrador(a)',
};

/** Credenciais provisórias para contas criadas por terceiros (RN15). */
@Injectable()
export class SenhaProvisoriaService {
  private readonly logger = new Logger(SenhaProvisoriaService.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    config: ConfigService,
  ) {
    this.frontendUrl = config.get<string>('FRONTEND_URL', 'http://localhost:5173');
  }

  /** Gera a senha e os campos de usuário correspondentes (para usar no create). */
  async gerar() {
    const senha = gerarSenhaProvisoria();
    return {
      senha,
      dados: {
        senhaHash: await gerarHashSenha(senha),
        senhaProvisoria: true,
        senhaProvisoriaExpiraEm: new Date(Date.now() + HORAS_VALIDADE_SENHA_PROVISORIA * 3_600_000),
      },
    };
  }

  /**
   * Envia a senha por e-mail. Uma falha não desfaz o cadastro: retorna false
   * para quem criou a conta poder reenviar (UC26 FA02).
   */
  async enviar(destinatario: { nome: string; email: string; perfil: string }, senha: string) {
    const primeiroNome = destinatario.nome.split(' ')[0];
    const perfil = NOME_PERFIL[destinatario.perfil] ?? 'usuário(a)';
    try {
      await this.email.enviar({
        para: destinatario.email,
        assunto: 'Hemobridge – sua conta de acesso',
        texto: [
          `Olá, ${primeiroNome}.`,
          '',
          `Uma conta de ${perfil} foi criada para você no Hemobridge.`,
          '',
          `E-mail: ${destinatario.email}`,
          `Senha provisória: ${senha}`,
          '',
          `Acesse ${this.frontendUrl} em até ${HORAS_VALIDADE_SENHA_PROVISORIA} horas.`,
          'No primeiro acesso, você deverá definir uma nova senha e aceitar o termo de responsabilidade e sigilo.',
          '',
          'Se a senha expirar, peça o reenvio a quem criou sua conta.',
        ].join('\n'),
      });
      return true;
    } catch (erro) {
      this.logger.error(`Falha ao enviar senha provisória: ${String(erro)}`);
      return false;
    }
  }

  /** UC26 FA02: nova senha provisória para conta ainda não ativada. */
  async reenviar(usuarioId: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { nome: true, email: true, perfil: true, status: true, senhaProvisoria: true },
    });
    if (!usuario) throw new NotFoundException('Usuário não encontrado.');
    if (!usuario.senhaProvisoria || usuario.status !== 'ATIVO') {
      throw new BadRequestException(
        'Só é possível reenviar a senha provisória de contas ativas que ainda não fizeram o primeiro acesso.',
      );
    }

    const { senha, dados } = await this.gerar();
    await this.prisma.usuario.update({
      where: { id: usuarioId },
      // A senha anterior e as sessões abertas com ela deixam de valer.
      data: { ...dados, versaoSessao: { increment: 1 }, tentativasLogin: 0, bloqueadoAte: null },
    });

    return {
      senhaProvisoriaEnviada: await this.enviar(usuario, senha),
      senhaProvisoriaExpiraEm: dados.senhaProvisoriaExpiraEm.toISOString(),
    };
  }
}
