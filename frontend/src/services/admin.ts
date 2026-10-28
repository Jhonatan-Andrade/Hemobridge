import { api } from '../api/client'
import type { HemocentroGestaoDetalhe, HemocentroGestaoResumo, HemocentroRef, Paginado } from '../api/types'

// RF15: hemocentros e seus Admins, pelo administrador da plataforma.
export type FiltrosHemocentrosGestao = { busca?: string; ativo?: boolean; pagina?: number; tamanhoPagina?: number }

export type DadosHemocentro = {
  nome: string
  cnpj: string
  endereco: string
  cidade: string
  estado: string
  cep: string
  telefone: string
  horarioFuncionamento?: string
}

export type NovoAdminHemocentro = { nome: string; cpf: string; email: string; telefone: string }

type ContaCriada = { id: string; nome: string; email: string }

export const gestaoHemocentrosService = {
  listar: (filtros: FiltrosHemocentrosGestao = {}) => api.get<Paginado<HemocentroGestaoResumo>>('/hemocentros/gestao', filtros),
  detalhar: (id: string) => api.get<HemocentroGestaoDetalhe>(`/hemocentros/gestao/${id}`),
  criar: (dados: DadosHemocentro & { admin: NovoAdminHemocentro }) =>
    api.post<{ hemocentro: HemocentroRef; admin: ContaCriada; senhaProvisoriaEnviada: boolean }>('/hemocentros', dados),
  /** Com `ativo: false`, a equipe perde o acesso e os agendamentos futuros são cancelados. */
  atualizar: (id: string, dados: Partial<DadosHemocentro> & { ativo?: boolean }) =>
    api.patch<HemocentroGestaoDetalhe>(`/hemocentros/${id}`, dados),
  adicionarAdmin: (id: string, dados: NovoAdminHemocentro) =>
    api.post<{ admin: ContaCriada; senhaProvisoriaEnviada: boolean }>(`/hemocentros/${id}/admins`, dados),
  reenviarSenhaAdmin: (id: string, usuarioId: string) =>
    api.post<{ senhaProvisoriaEnviada: boolean; senhaProvisoriaExpiraEm: string }>(
      `/hemocentros/${id}/admins/${usuarioId}/reenviar-senha-provisoria`,
    ),
}
