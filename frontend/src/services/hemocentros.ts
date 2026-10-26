import { api } from '../api/client'
import type { HemocentroDetalhe, HemocentroResumo, HorariosHemocentro, NecessidadesHemocentro, Paginado, TipoSanguineo } from '../api/types'

export type FiltrosHemocentros = { busca?: string; tipo?: TipoSanguineo; pagina?: number; tamanhoPagina?: number }

// Consulta pública: página Doar e Apresentação (RF03, RF05, RF18).
export const hemocentrosService = {
  /** Com `tipo`, quem precisa exatamente desse tipo vem primeiro, com `precisaDoTipo`. */
  listar: (filtros: FiltrosHemocentros = {}) => api.get<Paginado<HemocentroResumo>>('/hemocentros', filtros),
  detalhar: (id: string) => api.get<HemocentroDetalhe>(`/hemocentros/${id}`),
  /** Horários ainda não iniciados, com vagas restantes (padrão: próximos 30 dias). */
  horarios: (id: string, periodo: { de?: string; ate?: string } = {}) => api.get<HorariosHemocentro>(`/hemocentros/${id}/horarios`, periodo),
  necessidades: (id: string) => api.get<NecessidadesHemocentro>(`/hemocentros/${id}/necessidades`),
}
