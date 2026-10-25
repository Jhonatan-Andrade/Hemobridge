import { api } from '../api/client'
import type { HospitalDetalhe, HospitalResumo, Paginado, TipoSanguineo } from '../api/types'

export type FiltrosHospitais = {
  tipos?: TipoSanguineo[]
  estado?: string
  cidade?: string
  lat?: number
  lng?: number
  raioKm?: number
  pagina?: number
  tamanhoPagina?: number
}

// Consulta pública de bancos de sangue (RF20–RF22). Com `tipos`, o backend ordena pela
// maior necessidade desses tipos; com `lat`/`lng`, desempata pela menor distância.
export const hospitaisService = {
  listar: ({ tipos, ...filtros }: FiltrosHospitais = {}) =>
    api.get<Paginado<HospitalResumo>>('/hospitais', { ...filtros, tipos: tipos?.length ? tipos.join(',') : undefined }),
  detalhar: (id: string) => api.get<HospitalDetalhe>(`/hospitais/${id}`),
}
