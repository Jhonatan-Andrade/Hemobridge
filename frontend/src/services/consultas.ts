import { api } from '../api/client'
import type { ConsultaPaciente, MedicoComHorarios, TermoTelessaude } from '../api/types'

// UC09 – Agendar Consulta (teleconsulta) e UC10 – Cancelar ou Reagendar.
export const consultasService = {
  termoTelessaude: () => api.get<TermoTelessaude>('/paciente/consultas/termo-telessaude'),
  horarios: (filtros: { hospitalId?: string; data?: string } = {}) =>
    api.get<{ data: string | null; medicos: MedicoComHorarios[] }>('/paciente/consultas/horarios', filtros),
  listar: () => api.get<ConsultaPaciente[]>('/paciente/consultas'),
  agendar: (disponibilidadeId: string, versaoTermoTelessaude: string) =>
    api.post<{ mensagem: string; consulta: ConsultaPaciente }>('/paciente/consultas', {
      disponibilidadeId,
      aceiteTermoTelessaude: true,
      versaoTermoTelessaude,
    }),
}
