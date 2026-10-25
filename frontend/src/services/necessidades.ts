import { api } from '../api/client'
import type { AtualizacaoNecessidades, HistoricoNecessidade, NecessidadesHospital, NivelInformavel, Paginado, TipoSanguineo } from '../api/types'

export type FiltrosHistorico = { tipo?: TipoSanguineo; de?: string; ate?: string; pagina?: number; tamanhoPagina?: number }

// UC18: necessidades do hospital do representante logado.
export const necessidadesService = {
  listar: () => api.get<NecessidadesHospital>('/representante/necessidades'),
  atualizar: (niveis: { tipo: TipoSanguineo; nivel: NivelInformavel }[]) =>
    api.put<AtualizacaoNecessidades>('/representante/necessidades', { niveis }),
  historico: (filtros: FiltrosHistorico = {}) =>
    api.get<Paginado<HistoricoNecessidade>>('/representante/necessidades/historico', filtros),
}
