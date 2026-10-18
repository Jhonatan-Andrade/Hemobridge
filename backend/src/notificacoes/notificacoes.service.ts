import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '../generated/prisma/client.js';
import { EmailService } from '../email/email.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface NovaNotificacao {
  usuarioId: string;
  titulo: string;
  mensagem: string;
  /** Rota do frontend para a funcionalidade relacionada, ex.: "/meus-exames". */
  link?: string;
  /** Necessidade crítica que originou o aviso (UC19 / RN20). */
  necessidadeId?: string;
  /** Também envia por e-mail (registrando email_enviado_em). */
  email?: boolean;
}

type ClienteNotificacao = Pick<Prisma.TransactionClient, 'notificacao'>;

// Depois disso o e-mail deixa de ser reenviado; a notificação in-app continua.
export const MAX_TENTATIVAS_EMAIL = 5;
const LOTE_REENVIO = 50;

/**
 * Serviço central de notificações (HEM-36, Seção 9.2.3): registro in-app e,
 * opcionalmente, e-mail. A falha no e-mail não desfaz o registro in-app e fica
 * guardada para nova tentativa (UC19 FE02).
 */
@Injectable()
export class NotificacoesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificacoesService.name);
  private readonly frontendUrl: string;
  private readonly minutosReenvio: number;
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    config: ConfigService,
  ) {
    this.frontendUrl = config.get<string>('FRONTEND_URL', 'http://localhost:5173').replace(/\/+$/, '');
    this.minutosReenvio = Number(config.get('NOTIFICACOES_REENVIO_MINUTOS', 10));
  }

  onModuleInit() {
    if (this.minutosReenvio > 0) {
      this.timer = setInterval(() => void this.reenviarPendentes(), this.minutosReenvio * 60_000);
      this.timer.unref();
    }
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  /** Cria uma ou mais notificações e envia os e-mails solicitados. */
  async notificar(notificacoes: NovaNotificacao | NovaNotificacao[]): Promise<string[]> {
    const ids = await this.registrarEm(this.prisma, notificacoes);
    await this.despacharEmails(ids);
    return ids;
  }

  /**
   * Registra dentro de uma transação. Chame despacharEmails(ids) DEPOIS do
   * commit, para não enviar e-mail de uma operação que foi desfeita.
   */
  async registrarEm(tx: ClienteNotificacao, notificacoes: NovaNotificacao | NovaNotificacao[]): Promise<string[]> {
    const lista = Array.isArray(notificacoes) ? notificacoes : [notificacoes];
    if (!lista.length) return [];
    const criadas = await tx.notificacao.createManyAndReturn({
      data: lista.map((n) => ({
        usuarioId: n.usuarioId,
        titulo: n.titulo,
        mensagem: n.mensagem,
        link: n.link,
        necessidadeId: n.necessidadeId,
        emailSolicitado: n.email === true,
      })),
      select: { id: true },
    });
    return criadas.map((c) => c.id);
  }

  /** Envia os e-mails pendentes das notificações informadas. */
  async despacharEmails(ids: string[]): Promise<{ enviados: number; falhas: number }> {
    if (!ids.length) return { enviados: 0, falhas: 0 };
    const pendentes = await this.prisma.notificacao.findMany({
      where: { id: { in: ids }, emailSolicitado: true, emailEnviadoEm: null },
      select: SELECAO_ENVIO,
    });
    return this.enviar(pendentes);
  }

  /** Nova tentativa para e-mails que falharam (executado periodicamente). */
  async reenviarPendentes(): Promise<{ enviados: number; falhas: number }> {
    try {
      const pendentes = await this.prisma.notificacao.findMany({
        where: {
          emailSolicitado: true,
          emailEnviadoEm: null,
          emailTentativas: { gt: 0, lt: MAX_TENTATIVAS_EMAIL },
          usuario: { status: 'ATIVO' },
        },
        select: SELECAO_ENVIO,
        orderBy: { enviadaEm: 'asc' },
        take: LOTE_REENVIO,
      });
      return await this.enviar(pendentes);
    } catch (erro) {
      this.logger.error(`Falha no reenvio de e-mails pendentes: ${String(erro)}`);
      return { enviados: 0, falhas: 0 };
    }
  }

  private async enviar(pendentes: Pendente[]) {
    let enviados = 0;
    let falhas = 0;
    for (const n of pendentes) {
      try {
        await this.email.enviar({
          para: n.usuario.email,
          assunto: `Hemobridge – ${n.titulo}`,
          texto: this.textoEmail(n),
        });
        await this.prisma.notificacao.update({
          where: { id: n.id },
          data: { emailEnviadoEm: new Date(), emailTentativas: { increment: 1 }, emailUltimoErro: null },
        });
        enviados++;
      } catch (erro) {
        falhas++;
        this.logger.error(`Falha ao enviar e-mail da notificação ${n.id}: ${String(erro)}`);
        await this.prisma.notificacao
          .update({
            where: { id: n.id },
            data: { emailTentativas: { increment: 1 }, emailUltimoErro: String(erro).slice(0, 500) },
          })
          .catch(() => undefined);
      }
    }
    return { enviados, falhas };
  }

  private textoEmail(n: Pendente): string {
    const primeiroNome = n.usuario.nome.split(' ')[0];
    const linhas = [`Olá, ${primeiroNome}.`, '', n.mensagem];
    if (n.link) linhas.push('', `Acesse: ${this.frontendUrl}${n.link.startsWith('/') ? '' : '/'}${n.link}`);
    linhas.push('', 'Você também encontra este aviso em Notificações, na plataforma.');
    return linhas.join('\n');
  }
}

const SELECAO_ENVIO = {
  id: true,
  titulo: true,
  mensagem: true,
  link: true,
  usuario: { select: { nome: true, email: true } },
} as const;

type Pendente = {
  id: string;
  titulo: string;
  mensagem: string;
  link: string | null;
  usuario: { nome: string; email: string };
};
