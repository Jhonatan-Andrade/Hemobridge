import type { HospitalResumo, NivelNecessidade } from '../../api/types'

export const formatarDistancia = (km: number | null) =>
  km === null ? null : `${km.toLocaleString('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} km`

const PRIORIDADE: NivelNecessidade[] = ['CRITICO', 'BAIXO', 'ESTAVEL', 'ADEQUADO', 'NAO_INFORMADO']

/** Necessidades mais urgentes primeiro, ignorando tipos não informados. */
export function necessidadesPrioritarias(hospital: HospitalResumo, limite = 3) {
  return [...hospital.necessidades]
    .filter((n) => n.nivel !== 'NAO_INFORMADO')
    .sort((a, b) => PRIORIDADE.indexOf(a.nivel) - PRIORIDADE.indexOf(b.nivel))
    .slice(0, limite)
}
