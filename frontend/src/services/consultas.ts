import { api } from '../api/client'
import type { ConsultaPaciente, MedicoComHorarios, SolicitacaoExamePaciente, TermoTelessaude } from '../api/types'

type ResultadoConsulta = { mensagem: string; consulta: ConsultaPaciente }

// UC09 – Agendar Consulta (teleconsulta) e UC10 – Cancelar ou Reagendar.
export const consultasService = {
  termoTelessaude: () => api.get<TermoTelessaude>('/paciente/consultas/termo-telessaude'),
  horarios: (filtros: { hospitalId?: string; data?: string } = {}) =>
    api.get<{ data: string | null; medicos: MedicoComHorarios[] }>('/paciente/consultas/horarios', filtros),
  listar: () => api.get<ConsultaPaciente[]>('/paciente/consultas'),
  agendar: (disponibilidadeId: string, versaoTermoTelessaude: string) =>
    api.post<ResultadoConsulta>('/paciente/consultas', {
      disponibilidadeId,
      aceiteTermoTelessaude: true,
      versaoTermoTelessaude,
    }),
  cancelar: (id: string) => api.post<ResultadoConsulta>(`/paciente/consultas/${id}/cancelar`),
  reagendar: (id: string, disponibilidadeId: string) =>
    api.post<ResultadoConsulta>(`/paciente/consultas/${id}/reagendar`, { disponibilidadeId }),
}

// UC11 – Anexar Resultado de Exame
export const examesPacienteService = {
  listar: () => api.get<SolicitacaoExamePaciente[]>('/paciente/exames'),
  enviarResultado: (id: string, arquivo: File) => {
    const corpo = new FormData()
    corpo.append('arquivo', arquivo)
    return api.post<{ mensagem: string; solicitacao: SolicitacaoExamePaciente }>(`/paciente/exames/${id}/resultado`, corpo)
  },
  arquivo: (id: string, envioId: string) => api.arquivo(`/paciente/exames/${id}/envios/${envioId}/arquivo`),
}
