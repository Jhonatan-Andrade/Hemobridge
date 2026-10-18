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
  medico: {
    hospitalId: string;
    vinculos: { hospitalId: string; ativo?: boolean }[];
  };
}) {
  const id = h.hospitalId ?? h.medico.hospitalId;
  return h.medico.vinculos.length
    ? h.medico.vinculos.some((v) => v.hospitalId === id && v.ativo !== false)
    : id === h.medico.hospitalId;
}
