import type { Prisma } from '../generated/prisma/client.js';

/** O vínculo atual limita o acesso clínico, mesmo quando o médico segue ativo em outra unidade. */
export function horarioComVinculoClinicoAtivo(
  medicoId: string,
): Prisma.DisponibilidadeMedicoWhereInput {
  const hospital: Prisma.HospitalWhereInput = {
    ativo: true,
    OR: [
      { vinculosMedicos: { some: { medicoId, ativo: true } } },
      {
        medicos: {
          some: { usuarioId: medicoId, vinculos: { none: {} } },
        },
      },
    ],
  };
  return {
    medicoId,
    medico: { usuario: { status: 'ATIVO' } },
    OR: [{ hospital }, { hospitalId: null, medico: { hospital } }],
  };
}

export function consultaComVinculoClinicoAtivo(
  medicoId: string,
): Prisma.ConsultaWhereInput {
  return {
    medicoId,
    paciente: { usuario: { status: 'ATIVO' } },
    disponibilidade: horarioComVinculoClinicoAtivo(medicoId),
  };
}
