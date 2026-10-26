// Tipos espelhados das respostas da API (backend/src).

export type Perfil = 'PACIENTE' | 'EQUIPE' | 'ADMIN_PLATAFORMA'
/** Papel de quem trabalha no hemocentro (perfil EQUIPE). */
export type PapelEquipe = 'MEDICO' | 'ADMIN_HEMOCENTRO'
export type StatusUsuario = 'ATIVO' | 'INATIVO' | 'ENCERRADO'
/** Status da conta do paciente: vira ATIVA (doador) na ativação pelo hemocentro. */
export type SituacaoPaciente = 'PENDENTE' | 'ATIVA'
/** Define o intervalo mínimo e o limite anual de doações. */
export type Sexo = 'MASCULINO' | 'FEMININO'
export type NivelNecessidade = 'URGENTE' | 'NECESSARIO' | 'ESTAVEL'
export type StatusAgendamento = 'AGENDADO' | 'CANCELADO' | 'CONCLUIDO' | 'AUSENTE'
export type ResultadoDoacao = 'DOOU' | 'NAO_DOOU' | 'AUSENTE'

/** Os oito tipos ABO/Rh. */
export type TipoSanguineo = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'

export interface HemocentroRef {
  id: string
  nome: string
}

export interface UsuarioSessao {
  id: string
  nome: string
  email: string
  perfil: Perfil
  papel: PapelEquipe | null
  hemocentro: HemocentroRef | null
}

export interface Sessao {
  accessToken: string
  tokenType: 'Bearer'
  expiraEm: string
  primeiroAcesso: boolean
  usuario: UsuarioSessao
}

export interface UsuarioAutenticado extends UsuarioSessao {
  senhaProvisoria: boolean
}

export interface Termo {
  versao: string
  finalidade: string
}

/** RF01: termo do cadastro, com o texto que explica o compartilhamento entre hemocentros. */
export interface TermoConsentimento extends Termo {
  texto: string[]
}

export interface Paginado<T> {
  itens: T[]
  total: number
  pagina: number
  tamanhoPagina: number
}

// RF01
export interface Cadastro {
  nome: string
  cpf: string
  email: string
  senha: string
  confirmacaoSenha: string
  telefone: string
  dataNascimento: string
  sexo: Sexo
  aceiteTermo: boolean
  versaoTermo: string
}

export interface CadastroCriado {
  id: string
  nome: string
  email: string
  situacao: SituacaoPaciente
}

// ---------------------------------------------------------------------------
// Hemocentros, necessidades e horários (página Doar)
// ---------------------------------------------------------------------------

export interface NecessidadeResumo {
  tipo: TipoSanguineo
  nivel: NivelNecessidade
}

/** Um dos oito tipos; nível nulo = não informado. */
export interface NecessidadeTipo {
  tipo: TipoSanguineo
  nivel: NivelNecessidade | null
  atualizadoEm: string | null
}

export interface Endereco {
  endereco: string
  cidade: string
  estado: string
}

export interface HemocentroResumo extends HemocentroRef, Endereco {
  necessidades: NecessidadeResumo[]
  /** RF18: precisa exatamente do tipo informado na busca; nulo sem tipo. */
  precisaDoTipo: boolean | null
}

export interface HemocentroDetalhe extends HemocentroRef, Endereco {
  cep: string
  telefone: string | null
  horarioFuncionamento: string | null
  ultimaAtualizacao: string | null
  necessidades: NecessidadeTipo[]
}

export interface NecessidadesHemocentro {
  hemocentro: HemocentroRef
  ultimaAtualizacao: string | null
  necessidades: NecessidadeTipo[]
}

/** Datas e horas no fuso de Brasília; `inicio` e `fim` são os instantes (ISO). */
export interface HorarioBase {
  id: string
  data: string
  horaInicio: string
  horaFim: string
  inicio: string
  fim: string
}

export interface HorarioDisponivel extends HorarioBase {
  vagasTotal: number
  vagasRestantes: number
  disponivel: boolean
}

export interface HorariosHemocentro {
  hemocentro: HemocentroRef
  de: string
  ate: string
  horarios: HorarioDisponivel[]
}

// ---------------------------------------------------------------------------
// Paciente
// ---------------------------------------------------------------------------

export interface Agendamento {
  id: string
  status: StatusAgendamento
  criadoEm: string
  canceladoEm: string | null
  horario: HorarioBase
  hemocentro: HemocentroRef & Endereco
  podeCancelar: boolean
}

export interface ProximoAgendamento {
  id: string
  horario: HorarioBase
  hemocentro: HemocentroRef & Endereco
  podeCancelar: boolean
}

export interface DoacaoPaciente {
  id: string
  registradoEm: string
  resultado: ResultadoDoacao
  motivoNaoDoacao: string | null
  hemocentro: HemocentroRef & { cidade: string; estado: string }
}

// RF04
export interface Painel {
  id: string
  nome: string
  email: string
  cpf: string | null
  telefone: string | null
  dataNascimento: string | null
  /** Nulo em contas anteriores ao campo: vale a regra mais restritiva. */
  sexo: Sexo | null
  cadastradoEm: string
  situacao: SituacaoPaciente
  ativadoEm: string | null
  /** Só depois da ativação; somente leitura. */
  tipoSanguineo: TipoSanguineo | null
  /** Intervalo mínimo entre doações e limite em 12 meses (Ministério da Saúde). */
  regraDoacao: { intervaloDias: number; limiteAnual: number }
  /** AAAA-MM-DD: última doação efetiva + intervalo; nulo se nunca doou. */
  proximaDoacaoPermitida: string | null
  doacoes: DoacaoPaciente[]
  proximosAgendamentos: ProximoAgendamento[]
}

// ---------------------------------------------------------------------------
// Equipe do hemocentro
// ---------------------------------------------------------------------------

export interface DoacaoRegistrada {
  id: string
  compareceu: boolean
  doou: boolean
  tipoSanguineo: TipoSanguineo | null
  motivoNaoDoacao: string | null
  observacoes: string | null
  registradoEm: string
}

/** Atendimento registrado no hemocentro do membro da equipe. */
export interface Atendimento extends DoacaoRegistrada {
  data: string
  horaInicio: string
  horaFim: string
  paciente: { id: string; nome: string }
  medico: string
}

export interface Atendimentos extends Paginado<Atendimento> {
  de: string
  ate: string
  resumo: { total: number; doaram: number; naoDoaram: number; ausentes: number }
}

export interface PacienteNaAgenda {
  id: string
  nome: string
  idade: number | null
  situacao: SituacaoPaciente
  tipoSanguineo: TipoSanguineo | null
  ultimaDoacao: { registradoEm: string; hemocentro: HemocentroRef } | null
}

export interface AgendamentoNaAgenda {
  id: string
  status: StatusAgendamento
  paciente: PacienteNaAgenda
  doacao: DoacaoRegistrada | null
}

// RF10
export interface AgendaDia {
  data: string
  hemocentro: HemocentroRef
  horarios: (HorarioBase & { vagasTotal: number; ativo: boolean; agendamentos: AgendamentoNaAgenda[] })[]
}

export interface RegistroDoacao {
  agendamentoId: string
  compareceu: boolean
  doou: boolean
  tipoSanguineo?: TipoSanguineo
  motivoNaoDoacao?: string
  observacoes?: string
}

// RF12
export interface HistoricoPaciente {
  paciente: { id: string; nome: string; idade: number | null; situacao: SituacaoPaciente; tipoSanguineo: TipoSanguineo | null }
  doacoes: (DoacaoRegistrada & {
    resultado: ResultadoDoacao
    medico: string
    hemocentro: HemocentroRef & { cidade: string; estado: string }
    doMeuHemocentro: boolean
  })[]
}

// RF08
export interface HorarioGestao extends HorarioBase {
  vagasTotal: number
  ativo: boolean
  agendados: number
  vagasRestantes: number
}

// RF13
export interface PacientePendente {
  id: string
  nome: string
  email: string
  cpf: string | null
  doacao: { id: string; registradoEm: string; doou: boolean; tipoSanguineo: TipoSanguineo }
}

// RF14
export interface MembroEquipe {
  id: string
  nome: string
  email: string
  cpf: string | null
  telefone: string | null
  status: StatusUsuario
  papel: PapelEquipe
  primeiroAcessoPendente: boolean
  senhaProvisoriaExpiraEm: string | null
  criadoEm: string
}

// ---------------------------------------------------------------------------
// Administrador da plataforma (RF15)
// ---------------------------------------------------------------------------

export interface HemocentroGestaoResumo extends HemocentroRef {
  cnpj: string
  cidade: string
  estado: string
  ativo: boolean
  criadoEm: string
  totalMedicos: number
  totalAdmins: number
}

export interface AdminHemocentro {
  id: string
  nome: string
  email: string
  telefone: string | null
  status: StatusUsuario
  primeiroAcessoPendente: boolean
  senhaProvisoriaExpiraEm: string | null
}

export interface HemocentroGestaoDetalhe extends HemocentroRef, Endereco {
  cnpj: string
  cep: string
  telefone: string | null
  horarioFuncionamento: string | null
  ativo: boolean
  criadoEm: string
  atualizadoEm: string
  totalMedicos: number
  admins: AdminHemocentro[]
}
