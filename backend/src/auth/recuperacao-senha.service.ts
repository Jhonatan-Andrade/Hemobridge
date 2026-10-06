import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { gerarHashSenha } from '../common/senha.js';
import { gerarTokenAleatorio, hashToken } from '../common/token.js';
import { EmailService } from '../email/email.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RecuperarSenhaDto, RedefinirSenhaDto } from './dto/recuperacao-senha.dto.js';

// RN14
export const MINUTOS_VALIDADE_LINK = 30;

export const MENSAGEM_SOLICITACAO =
  'Se houver uma conta com este e-mail, enviaremos um link para redefinir a senha.';
const MENSAGEM_LINK_INVALIDO =
  'Este link de redefinição não é mais válido. Solicite um novo link.';

// UC06 – Recuperar Senha
@Injectable()
export class RecuperacaoSenhaService {
  private readonly logger = new Logger(RecuperacaoSenhaService.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    config: ConfigService,
  ) {
    this.frontendUrl = config.get<string>('FRONTEND_URL', 'http://localhost:5173');
  }

  /**
   * Responde sempre a mesma mensagem (RN14, FA01). O e-mail é enviado em
   * segundo plano para que o tempo de resposta não revele se a conta existe.
   */
  async solicitar(dto: RecuperarSenhaDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
      select: { id: true, nome: true, email: true, status: true, senhaProvisoria: true },
    });

    // Contas inativas ou encerradas não recuperam acesso. Contas com senha
    // provisória pedem o reenvio a quem as criou (RN15, UC07 FE01).
    if (usuario && usuario.status === 'ATIVO' && !usuario.senhaProvisoria) {
      const token = gerarTokenAleatorio();
      // Um novo pedido substitui o link anterior.
      await this.prisma.usuario.update({
        where: { id: usuario.id },
        data: {
          senhaResetTokenHash: hashToken(token),
          senhaResetExpiraEm: new Date(Date.now() + MINUTOS_VALIDADE_LINK * 60_000),
          senhaResetUsadoEm: null,
        },
      });

      void this.enviarLink(usuario.nome, usuario.email, token).catch((erro: unknown) =>
        this.logger.error(`Falha ao enviar e-mail de redefinição de senha: ${String(erro)}`),
      );
    }

    return { mensagem: MENSAGEM_SOLICITACAO };
  }

  async redefinir(dto: RedefinirSenhaDto) {
    const tokenHash = hashToken(dto.token);
    const usuario = await this.prisma.usuario.findUnique({
      where: { senhaResetTokenHash: tokenHash },
      select: { id: true, status: true, senhaResetExpiraEm: true },
    });

    const agora = new Date();
    // FE01: link inexistente, já utilizado (hash removido) ou expirado.
    if (
      !usuario ||
      usuario.status !== 'ATIVO' ||
      !usuario.senhaResetExpiraEm ||
      usuario.senhaResetExpiraEm <= agora
    ) {
      throw new BadRequestException(MENSAGEM_LINK_INVALIDO);
    }

    try {
      // O filtro pelo hash garante uso único mesmo com requisições concorrentes.
      await this.prisma.usuario.update({
        where: { id: usuario.id, senhaResetTokenHash: tokenHash },
        data: {
          senhaHash: await gerarHashSenha(dto.novaSenha),
          senhaResetTokenHash: null,
          senhaResetExpiraEm: null,
          senhaResetUsadoEm: agora,
          // Quem recupera a senha também sai de um bloqueio por tentativas (RN07)
          // e encerra as sessões abertas com a senha antiga.
          tentativasLogin: 0,
          bloqueadoAte: null,
          versaoSessao: { increment: 1 },
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        throw new BadRequestException(MENSAGEM_LINK_INVALIDO);
      }
      throw e;
    }

    return { mensagem: 'Senha redefinida com sucesso. Entre com a nova senha.' };
  }

  private async enviarLink(nome: string, email: string, token: string) {
    const link = `${this.frontendUrl}/redefinir-senha?token=${encodeURIComponent(token)}`;
    const primeiroNome = nome.split(' ')[0];

    await this.email.enviar({
      para: email,
      assunto: 'Hemobridge – redefinição de senha',
      texto: [
        `Olá, ${primeiroNome}.`,
        '',
        'Recebemos um pedido para redefinir a senha da sua conta no Hemobridge.',
        `Para criar uma nova senha, acesse o link abaixo em até ${MINUTOS_VALIDADE_LINK} minutos:`,
        '',
        link,
        '',
        'O link só pode ser usado uma vez. Se você não fez este pedido, ignore este e-mail: sua senha continua a mesma.',
      ].join('\n'),
      html: `<p>Olá, ${escaparHtml(primeiroNome)}.</p>
<p>Recebemos um pedido para redefinir a senha da sua conta no Hemobridge.</p>
<p>Para criar uma nova senha, acesse o link abaixo em até ${MINUTOS_VALIDADE_LINK} minutos:</p>
<p><a href="${link}">Redefinir minha senha</a></p>
<p>O link só pode ser usado uma vez. Se você não fez este pedido, ignore este e-mail: sua senha continua a mesma.</p>`,
    });
  }
}

function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
