import type { Prisma } from '../generated/prisma/client.js';

export const INSTITUICAO_ATIVA: Prisma.DisponibilidadeMedicoWhereInput = {
  medico: { usuario: { status: 'ATIVO' } },
  OR: [
    { hospital: { ativo: true } },
    { hospitalId: null, medico: { hospital: { ativo: true } } },
  ],
};

export function vinculoDaAgendaAtivo(h: {
  hospitalId: string | null;
  medico: { hospitalId: string; vinculos: { hospitalId: string }[] };
}) {
  return (
    !h.hospitalId ||
    h.hospitalId === h.medico.hospitalId ||
    h.medico.vinculos.some((v) => v.hospitalId === h.hospitalId)
  );
}
