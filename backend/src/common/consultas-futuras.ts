import type { Perfil } from '../generated/prisma/enums.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';

/**
 * RN09: ao desativar médico, paciente ou banco de sangue, as consultas futuras
 * ainda agendadas são canceladas e os pacientes voltam a Pré-cadastrado (RN10),
 * podendo agendar com outro médico.
 * TODO(UC12): notificar os pacientes quando houver notificações na plataforma.
 */
export async function cancelarConsultasFuturas(
  prisma: PrismaService,
  filtro: Prisma.ConsultaWhereInput,
  canceladaPor: Perfil,
  motivo: string,
): Promise<number> {
  const agora = new Date();
  const consultas = await prisma.consulta.findMany({
    where: { ...filtro, situacao: 'AGENDADA', disponibilidade: { inicio: { gt: agora } } },
    select: { id: true, pacienteId: true },
  });
  if (!consultas.length) return 0;

  await prisma.$transaction([
    prisma.consulta.updateMany({
      where: { id: { in: consultas.map((c) => c.id) } },
      data: { situacao: 'CANCELADA', canceladaPor, motivoCancelamento: motivo, encerradaEm: agora },
    }),
    prisma.paciente.updateMany({
      where: { usuarioId: { in: consultas.map((c) => c.pacienteId) }, situacao: 'CONSULTA_AGENDADA' },
      data: { situacao: 'PRE_CADASTRADO' },
    }),
  ]);
  return consultas.length;
}
