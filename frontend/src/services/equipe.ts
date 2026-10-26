import { api } from '../api/client'
import type {
  AgendaDia,
  Atendimentos,
  DoacaoRegistrada,
  HistoricoPaciente,
  HorarioGestao,
  MembroEquipe,
  NecessidadesHemocentro,
  NivelNecessidade,
  Paginado,
  PacientePendente,
  PapelEquipe,
  RegistroDoacao,
  StatusUsuario,
  TipoSanguineo,
} from '../api/types'

type Paginacao = { pagina?: number; tamanhoPagina?: number }

// RF10, RF11 e RF12: médico.
export const medicoService = {
  agenda: (data?: string) => api.get<AgendaDia>('/agenda', { data }),
  registrarDoacao: (dados: RegistroDoacao) => api.post<{ mensagem: string; doacao: DoacaoRegistrada }>('/doacoes', dados),
}

/** RF12: médico e Admin do hemocentro, só para pacientes com agendamento no hemocentro. */
export const historicoService = {
  doPaciente: (pacienteId: string) => api.get<HistoricoPaciente>(`/pacientes/${pacienteId}/historico`),
}

/** Atendimentos do próprio hemocentro: médico e Admin do hemocentro. */
export const atendimentosService = {
  listar: (filtros: Paginacao & { de?: string; ate?: string }) => api.get<Atendimentos>('/atendimentos', filtros),
}

export type NovoHorario = { data: string; horaInicio: string; horaFim: string; vagasTotal: number }
export type LoteHorarios = Omit<NovoHorario, 'data'> & { diaSemana: number; semanas: number; aPartirDe?: string }

// RF08: horários e vagas (Admin do hemocentro).
export const horariosService = {
  listar: (periodo: { de?: string; ate?: string } = {}) => api.get<{ de: string; ate: string; horarios: HorarioGestao[] }>('/horarios', periodo),
  criar: (dados: NovoHorario) => api.post<{ mensagem: string; horario: HorarioGestao }>('/horarios', dados),
  criarLote: (dados: LoteHorarios) =>
    api.post<{ mensagem: string; criados: number; ignorados: number; datas: string[] }>('/horarios/lote', dados),
  atualizar: (id: string, dados: { vagasTotal?: number; ativo?: boolean }) =>
    api.patch<{ mensagem: string; horario: HorarioGestao }>(`/horarios/${id}`, dados),
}

// RF17: necessidades do hemocentro do Admin.
export const necessidadesService = {
  atualizar: (hemocentroId: string, niveis: { tipo: TipoSanguineo; nivel: NivelNecessidade }[]) =>
    api.put<NecessidadesHemocentro & { mensagem: string }>(`/hemocentros/${hemocentroId}/necessidades`, { niveis }),
}

export type FiltrosEquipe = Paginacao & { papel?: PapelEquipe; status?: StatusUsuario; busca?: string }
export type NovoMedico = { nome: string; cpf: string; email: string; telefone: string }

// RF14: equipe do hemocentro do Admin.
export const equipeService = {
  listar: (filtros: FiltrosEquipe = {}) => api.get<Paginado<MembroEquipe>>('/equipe', filtros),
  detalhar: (id: string) => api.get<MembroEquipe>(`/equipe/${id}`),
  criar: (dados: NovoMedico) => api.post<{ medico: MembroEquipe; senhaProvisoriaEnviada: boolean }>('/equipe', dados),
  /** Nome e CPF não são editáveis; `ativo` desativa ou reativa o acesso. */
  atualizar: (id: string, dados: { email?: string; telefone?: string; ativo?: boolean }) => api.patch<MembroEquipe>(`/equipe/${id}`, dados),
  reenviarSenhaProvisoria: (id: string) =>
    api.post<{ senhaProvisoriaEnviada: boolean; senhaProvisoriaExpiraEm: string }>(`/equipe/${id}/reenviar-senha-provisoria`),
}

// RF13: ativação de contas.
export const ativacaoService = {
  pendentes: (paginacao: Paginacao = {}) => api.get<Paginado<PacientePendente>>('/pacientes/pendentes-ativacao', paginacao),
  ativar: (pacienteId: string) =>
    api.patch<{ mensagem: string; paciente: { id: string; tipoSanguineo: TipoSanguineo } }>(`/pacientes/${pacienteId}/ativar`),
}
