import { api } from '../api/client'
import type { Doador } from '../api/types'

// Paciente logado: situação do processo (RN10) e tipo sanguíneo validado pelo médico (RF12).
export const doadorService = {
  obterPerfil: () => api.get<Doador>('/pacientes/me'),
}
