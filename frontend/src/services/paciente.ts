import { api } from '../api/client'
import type { Agendamento, Painel } from '../api/types'

type ResultadoAgendamento = { mensagem: string; agendamento: Agendamento }

// RF04 e RF16: painel e exclusão de dados do paciente logado.
export const pacienteService = {
  painel: () => api.get<Painel>('/pacientes/me/painel'),
  excluirDados: (senha: string) => api.post<{ mensagem: string }>('/pacientes/me/exclusao', { senha }),
}

// RF06 e RF07: agendamento, cancelamento e reagendamento.
export const agendamentosService = {
  agendar: (horarioId: string) => api.post<ResultadoAgendamento>('/agendamentos', { horarioId }),
  meus: () => api.get<Agendamento[]>('/agendamentos/meus'),
  cancelar: (id: string) => api.patch<ResultadoAgendamento>(`/agendamentos/${id}/cancelar`),
  reagendar: (id: string, horarioId: string) => api.patch<ResultadoAgendamento>(`/agendamentos/${id}/reagendar`, { horarioId }),
}
