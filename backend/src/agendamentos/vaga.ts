import type { Prisma } from '../generated/prisma/client.js';

/**
 * Agendamentos que ocupam a vaga do horário: o agendado e também o já atendido
 * (CONCLUIDO ou AUSENTE). Só o cancelamento devolve a vaga.
 */
export const OCUPA_VAGA = { status: { not: 'CANCELADO' } } satisfies Prisma.AgendamentoWhereInput;
