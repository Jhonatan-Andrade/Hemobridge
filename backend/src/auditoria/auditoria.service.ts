import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** Ações registradas na auditoria (RNF05). */
export const ACOES_AUDITORIA = {
  /** Leitura do histórico de doações de um paciente só com registros do próprio hemocentro. */
  VER_HISTORICO: 'VER_HISTORICO',
  /** Leitura que inclui registros de outro hemocentro (RF12). */
  VER_HISTORICO_COMPARTILHADO: 'VER_HISTORICO_COMPARTILHADO',
  /** Agenda do médico com a última doação do paciente feita em outro hemocentro. */
  VER_ULTIMA_DOACAO_COMPARTILHADA: 'VER_ULTIMA_DOACAO_COMPARTILHADA',
  REGISTRAR_DOACAO: 'REGISTRAR_DOACAO',
  /** Leitura da triagem clínica e dos exames de uma doação. */
  VER_DADOS_CLINICOS: 'VER_DADOS_CLINICOS',
  REGISTRAR_EXAMES: 'REGISTRAR_EXAMES',
  ATIVAR_CONTA: 'ATIVAR_CONTA',
  EXCLUIR_DADOS: 'EXCLUIR_DADOS',
} as const;

export type AcaoAuditoria = (typeof ACOES_AUDITORIA)[keyof typeof ACOES_AUDITORIA];

export interface RegistroAuditoria {
  usuarioId: string;
  acao: AcaoAuditoria;
  entidade: 'paciente' | 'doacao';
  entidadeId: string;
  hemocentroId?: string | null;
}

type Cliente = Pick<PrismaService, 'auditoria'> | Prisma.TransactionClient;

/** RNF05: registro de acesso e alteração de dados sensíveis. */
@Injectable()
export class AuditoriaService {
  constructor(private readonly prisma: PrismaService) {}

  /** Grava os registros; dentro de uma transação, passe o cliente dela em `tx`. */
  async registrar(registros: RegistroAuditoria | RegistroAuditoria[], tx: Cliente = this.prisma) {
    const lista = Array.isArray(registros) ? registros : [registros];
    if (!lista.length) return;
    await tx.auditoria.createMany({ data: lista });
  }
}
