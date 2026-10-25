import { api } from '../api/client'
import type { Medico, Paginado, StatusUsuario } from '../api/types'

export type FiltrosMedicos = { status?: StatusUsuario; busca?: string; pagina?: number; tamanhoPagina?: number }

export type NovoMedico = {
  nome: string
  cpf: string
  email: string
  telefone: string
  crm: string
  ufCrm: string
  declaracaoCrmConferido: boolean
}

// UC22: médicos do hospital do representante logado.
export const medicosService = {
  listar: (filtros: FiltrosMedicos = {}) => api.get<Paginado<Medico>>('/representante/medicos', filtros),
  detalhar: (id: string) => api.get<Medico>(`/representante/medicos/${id}`),
  criar: (dados: NovoMedico) => api.post<{ medico: Medico; senhaProvisoriaEnviada: boolean }>('/representante/medicos', dados),
  // FA01: CPF e CRM não são editáveis.
  atualizar: (id: string, dados: { email?: string; telefone?: string }) => api.patch<Medico>(`/representante/medicos/${id}`, dados),
  desativar: (id: string) => api.post<Medico>(`/representante/medicos/${id}/desativar`),
  ativar: (id: string) => api.post<Medico>(`/representante/medicos/${id}/ativar`),
  reenviarSenhaProvisoria: (id: string) =>
    api.post<{ senhaProvisoriaEnviada: boolean; senhaProvisoriaExpiraEm: string }>(`/representante/medicos/${id}/reenviar-senha-provisoria`),
}
