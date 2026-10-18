import type { Prisma } from '../generated/prisma/client.js';

/** Cancelamento institucional independe da antecedência exigida ao paciente. */
export async function cancelarConsultasFuturas(
  tx: Prisma.TransactionClient,
  filtro: Prisma.ConsultaWhereInput,
  motivo: string,
  responsavelId?: string,
) {
  const agora = new Date();
  const consultas = await tx.consulta.updateManyAndReturn({
    where: {
      AND: [
        filtro,
        { status: 'AGENDADA', disponibilidade: { inicio: { gt: agora } } },
      ],
    },
    data: {
      status: 'CANCELADA',
      canceladaEm: agora,
      motivoCancelamento: motivo,
      canceladaPorId: responsavelId,
    },
    select: { id: true, pacienteId: true, medicoId: true },
  });
  if (!consultas.length) return 0;
  await tx.paciente.updateMany({
    where: {
      usuarioId: { in: consultas.map((c) => c.pacienteId) },
      situacao: 'CONSULTA_AGENDADA',
      consultas: { none: { status: 'AGENDADA' } },
    },
    data: { situacao: 'PRE_CADASTRADO' },
  });
  await tx.notificacao.createMany({
    data: consultas.flatMap((c) =>
      [...new Set([c.pacienteId, c.medicoId])].map((usuarioId) => ({
        usuarioId,
        titulo: 'Consulta cancelada pela instituição',
        mensagem:
          'Uma consulta futura foi cancelada por alteração na disponibilidade da conta ou da instituição. Consulte sua agenda para escolher outro horário.',
        link:
          usuarioId === c.pacienteId
            ? '/#external-consultations'
            : '/#professional',
        emailSolicitado: true,
      })),
    ),
  });
  await tx.logAuditoria.createMany({
    data: consultas.map((c) => ({
      usuarioId: responsavelId,
      acao: 'CANCELAR_CONSULTA_OPERACIONAL',
      entidade: 'consulta',
      entidadeId: c.id,
      detalhes: { motivo },
    })),
  });
  return consultas.length;
}
