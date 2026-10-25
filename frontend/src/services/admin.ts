import { api } from '../api/client'
import type {
  HospitalAdminDetalhe,
  HospitalAdminResumo,
  Paginado,
  Perfil,
  StatusUsuario,
  UsuarioAdminDetalhe,
  UsuarioAdminResumo,
} from '../api/types'

// UC25 – Gerenciar bancos de sangue e representantes (/admin/hospitais).
export type FiltrosHospitaisAdmin = { busca?: string; estado?: string; ativo?: boolean; pagina?: number; tamanhoPagina?: number }

export type DadosHospital = {
  nome: string
  cnpj: string
  endereco: string
  cidade: string
  estado: string
  cep: string
  telefone: string
  horarioFuncionamento?: string
  latitude: number
  longitude: number
}

export type NovoRepresentante = { nome: string; cpf: string; email: string; telefone: string; cargo?: string }

type ContaCriada = { id: string; nome: string; email: string }

export const hospitaisAdminService = {
  listar: (filtros: FiltrosHospitaisAdmin = {}) => api.get<Paginado<HospitalAdminResumo>>('/admin/hospitais', filtros),
  detalhar: (id: string) => api.get<HospitalAdminDetalhe>(`/admin/hospitais/${id}`),
  criar: (dados: DadosHospital & { representante: NovoRepresentante }) =>
    api.post<{ hospital: HospitalAdminResumo; representante: ContaCriada; senhaProvisoriaEnviada: boolean }>('/admin/hospitais', dados),
  atualizar: (id: string, dados: Partial<DadosHospital>) => api.patch<HospitalAdminDetalhe>(`/admin/hospitais/${id}`, dados),
  desativar: (id: string) => api.post<{ id: string; ativo: false }>(`/admin/hospitais/${id}/desativar`),
  ativar: (id: string) => api.post<{ id: string; ativo: true }>(`/admin/hospitais/${id}/ativar`),
  adicionarRepresentante: (id: string, dados: NovoRepresentante) =>
    api.post<{ representante: ContaCriada; senhaProvisoriaEnviada: boolean }>(`/admin/hospitais/${id}/representantes`, dados),
}

// UC26 – Gerenciar usuários (/admin/usuarios).
export type FiltrosUsuariosAdmin = { perfil?: Perfil; status?: StatusUsuario; busca?: string; pagina?: number; tamanhoPagina?: number }

export type NovoAdministrador = { nome: string; cpf: string; email: string; telefone?: string }

export const usuariosAdminService = {
  listar: (filtros: FiltrosUsuariosAdmin = {}) => api.get<Paginado<UsuarioAdminResumo>>('/admin/usuarios', filtros),
  detalhar: (id: string) => api.get<UsuarioAdminDetalhe>(`/admin/usuarios/${id}`),
  atualizar: (id: string, dados: { nome?: string; email?: string; telefone?: string }) =>
    api.patch<UsuarioAdminDetalhe>(`/admin/usuarios/${id}`, dados),
  desativar: (id: string) => api.post<{ id: string; status: 'INATIVO' }>(`/admin/usuarios/${id}/desativar`),
  ativar: (id: string) => api.post<{ id: string; status: 'ATIVO' }>(`/admin/usuarios/${id}/ativar`),
  reenviarSenhaProvisoria: (id: string) =>
    api.post<{ senhaProvisoriaEnviada: boolean; senhaProvisoriaExpiraEm: string }>(`/admin/usuarios/${id}/reenviar-senha-provisoria`),
  criarAdministrador: (dados: NovoAdministrador) =>
    api.post<{ administrador: ContaCriada; senhaProvisoriaEnviada: boolean }>('/admin/usuarios/administradores', dados),
}
