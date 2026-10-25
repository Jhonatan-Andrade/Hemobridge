// Tipos espelhados das respostas da API (backend/src).

export type Perfil = 'PACIENTE' | 'MEDICO' | 'REPRESENTANTE' | 'ADMINISTRADOR'
/** Doador é o Paciente com situação APROVADO (RN10). */
export type Papel = Perfil | 'DOADOR'
export type StatusUsuario = 'ATIVO' | 'INATIVO' | 'ENCERRADO'
export type Sexo = 'MASCULINO' | 'FEMININO'
export type SituacaoPaciente =
  | 'PRE_CADASTRADO'
  | 'CONSULTA_AGENDADA'
  | 'AGUARDANDO_EXAME'
  | 'EM_ANALISE'
  | 'APROVADO'
  | 'REPROVADO'
export type NivelNecessidade = 'CRITICO' | 'BAIXO' | 'ESTAVEL' | 'ADEQUADO' | 'NAO_INFORMADO'
export type NivelInformavel = Exclude<NivelNecessidade, 'NAO_INFORMADO'>

export interface UsuarioSessao {
  id: string
  nome: string
  email: string
  perfil: Perfil
  papel: Papel
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

export interface Paginado<T> {
  itens: T[]
  total: number
  pagina: number
  tamanhoPagina: number
}

// UC02 / UC03
export interface NecessidadeResumo {
  tipo: string
  nivel: NivelNecessidade
}

export interface HospitalResumo {
  id: string
  nome: string
  cidade: string
  estado: string
  distanciaKm: number | null
  necessidades: NecessidadeResumo[]
}

export interface HospitalDetalhe {
  id: string
  nome: string
  endereco: string
  cidade: string
  estado: string
  cep: string
  telefone: string
  horarioFuncionamento: string | null
  latitude: number
  longitude: number
  necessidades: (NecessidadeResumo & { atualizadoEm: string | null })[]
  ultimaAtualizacao: string | null
}

// UC04
export interface Compatibilidade {
  aviso: string
  tipos: { sigla: string; podeDoarPara: string[]; podeReceberDe: string[] }[]
}

// UC18
export interface NecessidadesHospital {
  hospital: { id: string; nome: string }
  ultimaAtualizacao: string | null
  necessidades: {
    tipo: string
    nivel: NivelNecessidade
    atualizadoEm: string | null
    atualizadoPor: string | null
  }[]
}

export interface AtualizacaoNecessidades extends NecessidadesHospital {
  mensagem: string
  alteracoes: { tipo: string; de: NivelNecessidade; para: NivelNecessidade }[]
  passaramACritico: string[]
}

export interface HistoricoNecessidade {
  tipo: string
  de: NivelNecessidade
  para: NivelNecessidade
  alteradoEm: string
  alteradoPor: string
}

// UC22
export interface Medico {
  id: string
  nome: string
  email: string
  cpf: string
  telefone: string
  crm: string
  ufCrm: string
  crmConferidoEm: string
  status: StatusUsuario
  primeiroAcessoPendente: boolean
  senhaProvisoriaExpiraEm: string | null
}

// UC25
export interface HospitalAdminResumo {
  id: string
  nome: string
  cnpj: string
  cidade: string
  estado: string
  ativo: boolean
  criadoEm: string
  totalRepresentantes: number
  totalMedicos: number
}

export interface RepresentanteResumo {
  id: string
  nome: string
  email: string
  telefone: string
  cargo: string | null
  status: StatusUsuario
  primeiroAcessoPendente: boolean
  senhaProvisoriaExpiraEm: string | null
}

export interface HospitalAdminDetalhe {
  id: string
  nome: string
  cnpj: string
  endereco: string
  cidade: string
  estado: string
  cep: string
  telefone: string
  horarioFuncionamento: string | null
  latitude: number
  longitude: number
  ativo: boolean
  criadoEm: string
  atualizadoEm: string
  totalMedicos: number
  representantes: RepresentanteResumo[]
}

// UC26
export interface UsuarioAdminResumo {
  id: string
  nome: string
  email: string
  cpf: string
  perfil: Perfil
  papel: Papel
  status: StatusUsuario
  primeiroAcessoPendente: boolean
  hospital: string | null
  criadoEm: string
}

export interface UsuarioAdminDetalhe {
  id: string
  nome: string
  email: string
  cpf: string
  telefone: string | null
  perfil: Perfil
  papel: Papel
  status: StatusUsuario
  primeiroAcessoPendente: boolean
  senhaProvisoriaExpiraEm: string | null
  bloqueadoAte: string | null
  criadoEm: string
  atualizadoEm: string
  paciente: { situacao: SituacaoPaciente; cidade?: string; estado?: string } | null
  medico: { crm: string; ufCrm: string; hospital: { id: string; nome: string } } | null
  representante: { cargo: string | null; hospital: { id: string; nome: string } } | null
}
