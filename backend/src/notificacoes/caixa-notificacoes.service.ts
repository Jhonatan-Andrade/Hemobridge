import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ListarNotificacoesDto } from './dto/listar-notificacoes.dto.js';

const SELECAO = {
  id: true,
  titulo: true,
  mensagem: true,
  link: true,
  enviadaEm: true,
  lidaEm: true,
} as const;

// UC12 – Visualizar Notificações (RF30). Sempre do próprio usuário.
@Injectable()
export class CaixaNotificacoesService {
  constructor(private readonly prisma: PrismaService) {}

  // Passo 2: da mais recente para a mais antiga, com o contador de não lidas.
  async listar(usuarioId: string, { somenteNaoLidas, pagina, tamanhoPagina }: ListarNotificacoesDto) {
    const where = { usuarioId, ...(somenteNaoLidas ? { lidaEm: null } : {}) };
    const [itens, total, naoLidas] = await Promise.all([
      this.prisma.notificacao.findMany({
        where,
        select: SELECAO,
        orderBy: { enviadaEm: 'desc' },
        skip: (pagina - 1) * tamanhoPagina,
        take: tamanhoPagina,
      }),
      this.prisma.notificacao.count({ where }),
      this.contarNaoLidas(usuarioId),
    ]);

    return {
      itens: itens.map((n) => ({ ...n, lida: n.lidaEm !== null })),
      total,
      naoLidas,
      pagina,
      tamanhoPagina,
      // FE01
      mensagem: total === 0 ? 'Você não tem notificações.' : undefined,
    };
  }

  contarNaoLidas(usuarioId: string) {
    return this.prisma.notificacao.count({ where: { usuarioId, lidaEm: null } });
  }

  // Passos 4 e 5: exibe o conteúdo e marca como lida.
  async abrir(usuarioId: string, id: string) {
    const notificacao = await this.prisma.notificacao.findFirst({ where: { id, usuarioId }, select: SELECAO });
    // Notificação de outro usuário responde como inexistente (não revela o id).
    if (!notificacao) throw new NotFoundException('Notificação não encontrada.');

    if (notificacao.lidaEm === null) {
      notificacao.lidaEm = new Date();
      await this.prisma.notificacao.updateMany({
        where: { id, usuarioId, lidaEm: null },
        data: { lidaEm: notificacao.lidaEm },
      });
    }
    return { ...notificacao, lida: true };
  }

  // FA01
  async marcarTodasComoLidas(usuarioId: string) {
    const { count } = await this.prisma.notificacao.updateMany({
      where: { usuarioId, lidaEm: null },
      data: { lidaEm: new Date() },
    });
    return { atualizadas: count, naoLidas: 0 };
  }
}
