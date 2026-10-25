import { api } from '../api/client'
import type {
  AgendaMedico,
  ConsultaMedico,
  ConsultaMedicoResumo,
  Paginado,
  SituacaoConsulta,
  SituacaoExame,
  SolicitacaoExameMedico,
  SolicitacaoExameResumo,
  TipoSanguineo,
} from '../api/types'

export type NovosHorarios = { data: string; inicio: string; fim: string; duracaoMinutos: number; linkSala: string }

/** UC14 passo 3: exames (UC15) ou motivo da reprovação (FA01), nunca os dois. */
export type RegistroRealizada = { observacoes?: string; exames?: string[]; orientacoes?: string; motivoReprovacao?: string }

type Paginacao = { pagina?: number; tamanhoPagina?: number }

// UC13 – Gerenciar Agenda
export const agendaService = {
  listar: (periodo: { de?: string; ate?: string } = {}) => api.get<AgendaMedico>('/medico/agenda', periodo),
  criar: (dados: NovosHorarios) => api.post<AgendaMedico & { mensagem: string }>('/medico/agenda', dados),
  remover: (id: string) => api.delete<{ mensagem: string }>(`/medico/agenda/${id}`),
}

type ResultadoConsulta = { mensagem: string; consulta: ConsultaMedico }

// UC14 – Registrar Atendimento e UC15 – Solicitar Exames
export const atendimentoService = {
  listar: (filtros: Paginacao & { situacao?: SituacaoConsulta } = {}) =>
    api.get<Paginado<ConsultaMedicoResumo>>('/medico/consultas', filtros),
  detalhar: (id: string) => api.get<ConsultaMedico>(`/medico/consultas/${id}`),
  registrarRealizada: (id: string, dados: RegistroRealizada) => api.post<ResultadoConsulta>(`/medico/consultas/${id}/realizada`, dados),
  registrarNaoComparecimento: (id: string) => api.post<ResultadoConsulta>(`/medico/consultas/${id}/nao-compareceu`),
  cancelar: (id: string, motivo: string) => api.post<ResultadoConsulta>(`/medico/consultas/${id}/cancelar`, { motivo }),
}

type ResultadoAvaliacao = { mensagem: string; solicitacao: SolicitacaoExameMedico }

// UC16 – Avaliar Cadastro do Paciente
export const examesMedicoService = {
  listar: (filtros: Paginacao & { situacao?: SituacaoExame } = {}) =>
    api.get<Paginado<SolicitacaoExameResumo>>('/medico/exames', filtros),
  detalhar: (id: string) => api.get<SolicitacaoExameMedico>(`/medico/exames/${id}`),
  arquivo: (id: string, envioId: string) => api.arquivo(`/medico/exames/${id}/envios/${envioId}/arquivo`),
  aprovar: (id: string, tipoSanguineo: TipoSanguineo) => api.post<ResultadoAvaliacao>(`/medico/exames/${id}/aprovar`, { tipoSanguineo }),
  reprovar: (id: string, motivo: string) => api.post<ResultadoAvaliacao>(`/medico/exames/${id}/reprovar`, { motivo }),
}
