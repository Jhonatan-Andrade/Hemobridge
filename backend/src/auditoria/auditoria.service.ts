import { Injectable, Logger } from '@nestjs/common';
import { isIP } from 'node:net';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface RegistroAuditoria {
  /** Quem executou; nulo em operações anônimas (ex.: login com e-mail inexistente). */
  usuarioId?: string | null;
  /** Verbo em MAIÚSCULAS, ex.: LOGIN, PRE_CADASTRO, VISUALIZAR_EXAME. */
  acao: string;
  /** Nome da tabela/entidade afetada, ex.: usuario, exame. */
  entidade: string;
  entidadeId?: string | null;
  ipOrigem?: string | null;
  /** Contexto sem dados sensíveis: nunca senha, conteúdo de exame ou tipo sanguíneo. */
  detalhes?: Prisma.InputJsonValue;
}

type ClienteAuditoria = Pick<Prisma.TransactionClient, 'logAuditoria'>;

/**
 * RNF05 – log de auditoria de acessos e operações sobre dados sensíveis.
 * A tabela é somente inclusão: o banco recusa UPDATE, DELETE e TRUNCATE.
 */
@Injectable()
export class AuditoriaService {
  private readonly logger = new Logger(AuditoriaService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Grava fora de transação. Uma falha na auditoria é registrada no log da
   * aplicação e não interrompe a operação do usuário.
   */
  async registrar(registro: RegistroAuditoria): Promise<void> {
    try {
      await this.gravar(this.prisma, registro);
    } catch (erro) {
      this.logger.error(`Falha ao gravar auditoria ${registro.acao}/${registro.entidade}: ${String(erro)}`);
    }
  }

  /**
   * Grava dentro de uma transação existente: se a auditoria falhar, a operação
   * inteira é desfeita. Use quando o registro precisa ser atômico com a alteração.
   */
  async registrarEm(tx: ClienteAuditoria, registro: RegistroAuditoria): Promise<void> {
    await this.gravar(tx, registro);
  }

  private async gravar(cliente: ClienteAuditoria, r: RegistroAuditoria) {
    await cliente.logAuditoria.create({
      data: {
        usuarioId: r.usuarioId ?? null,
        acao: r.acao,
        entidade: r.entidade,
        entidadeId: r.entidadeId ?? null,
        ipOrigem: normalizarIp(r.ipOrigem),
        detalhes: r.detalhes,
      },
    });
  }
}

/** Aceita apenas IPs válidos para a coluna INET (descarta lixo de cabeçalhos). */
export function normalizarIp(ip?: string | null): string | null {
  if (!ip) return null;
  const limpo = ip.trim();
  return isIP(limpo) ? limpo : null;
}
