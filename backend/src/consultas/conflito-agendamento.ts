import { Prisma } from '../generated/prisma/client.js';

// Prisma 7 expõe a exclusão PostgreSQL como P2039. Somente a restrição de
// ocupação da disponibilidade representa este conflito de agendamento.
export function ehConflitoDeAgendamento(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (['P2002', 'P2004'].includes(error.code)) return true;
  if (error.code !== 'P2039' || error.meta?.modelName !== 'Consulta')
    return false;
  const adapter = error.meta.driverAdapterError as
    | { cause?: { kind?: unknown; code?: unknown; originalMessage?: unknown } }
    | undefined;
  const cause = adapter?.cause;
  return (
    cause?.kind === 'postgres' &&
    cause.code === '23P01' &&
    typeof cause.originalMessage === 'string' &&
    cause.originalMessage.includes(
      'exclusion constraint "consulta_disponibilidade_ativa_excl"',
    )
  );
}
