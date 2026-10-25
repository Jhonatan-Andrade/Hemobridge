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

/** Os oito tipos ABO/Rh (RN01). */
export type TipoSanguineo = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'

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

// UC01
export interface PreCadastro {
  nome: string
  cpf: string
  email: string
  senha: string
  confirmacaoSenha: string
  telefone: string
  dataNascimento: string
  sexo: Sexo
  pesoKg: number
  cidade: string
  estado: string
  aceiteTermo: boolean
  versaoTermo: string
  cienteRegraAcimaDe60?: boolean
}

export interface PreCadastroCriado {
  id: string
  nome: string
  email: string
  situacao: SituacaoPaciente
  proximoPasso: string
}

// Nomes de domínio usados nas telas. O "banco de sangue" do produto é o hospital
// cadastrado pelo administrador e mantido pelo representante.
export type Necessidade = NecessidadeResumo
export type BancoDeSangue = HospitalDetalhe

/**
 * Dados do doador logado. Ainda não há endpoint no backend que devolva o tipo
 * sanguíneo e a cidade do paciente (ver README → "Contratos pendentes").
 */
export interface Doador {
  id: string
  nome: string
  situacao: SituacaoPaciente
  tipoSanguineo: TipoSanguineo | null
  cidade: string
  estado: string
}

// UC13–UC16 – área do médico
export type SituacaoConsulta = 'AGENDADA' | 'REALIZADA' | 'NAO_COMPARECEU' | 'CANCELADA'
export type SituacaoExame = 'AGUARDANDO_RESULTADO' | 'EM_ANALISE' | 'REPROVADO' | 'VALIDADO'

type PacienteRef = { id: string; nome: string }

export interface HorarioAgenda {
  id: string
  inicio: string
  fim: string
  linkSala: string
  livre: boolean
  consulta: { id: string; situacao: SituacaoConsulta; paciente: PacienteRef } | null
}

export interface AgendaMedico {
  de: string
  ate: string
  horarios: HorarioAgenda[]
}

export interface ConsultaMedicoResumo {
  id: string
  situacao: SituacaoConsulta
  inicio: string
  fim: string
  paciente: PacienteRef
}

export interface ConsultaMedico {
  id: string
  situacao: SituacaoConsulta
  inicio: string
  fim: string
  linkSala: string
  observacoes: string | null
  motivoReprovacao: string | null
  canceladaPor: Perfil | null
  motivoCancelamento: string | null
  encerradaEm: string | null
  consultaOrigemId: string | null
  paciente: PacienteRef & {
    idade: number
    sexo: Sexo
    pesoKg: number
    cidade: string
    estado: string
    situacao: SituacaoPaciente
  }
  solicitacaoExame: { id: string; exames: string[]; orientacoes: string | null; situacao: SituacaoExame } | null
}

export interface EnvioExame {
  id: string
  situacao: SituacaoExame
  nomeArquivo: string
  mimeType: string
  tamanhoBytes: number
  enviadoEm: string
  avaliadoEm: string | null
  motivoReprovacao: string | null
}

export interface SolicitacaoExameResumo {
  id: string
  exames: string[]
  situacao: SituacaoExame
  atualizadoEm: string
  paciente: PacienteRef
  ultimoEnvioEm: string | null
}

export interface SolicitacaoExameMedico {
  id: string
  exames: string[]
  orientacoes: string | null
  situacao: SituacaoExame
  criadoEm: string
  consulta: { id: string; inicio: string }
  paciente: PacienteRef & {
    idade: number
    sexo: Sexo
    pesoKg: number
    situacao: SituacaoPaciente
    tipoSanguineo: TipoSanguineo | null
  }
  envios: EnvioExame[]
}

// UC09 / UC10 – teleconsulta do paciente
export interface TermoTelessaude {
  versao: string
  titulo: string
  texto: string
}

export interface MedicoComHorarios {
  id: string
  nome: string
  crm: string
  ufCrm: string
  hospital: { nome: string; cidade: string; estado: string }
  horarios: { id: string; inicio: string; fim: string }[]
}

export interface ConsultaPaciente {
  id: string
  situacao: SituacaoConsulta
  inicio: string
  fim: string
  medico: { nome: string; crm: string; ufCrm: string }
  hospital: { nome: string; cidade: string; estado: string }
  /** Só preenchido de 15 minutos antes até o fim do horário (RN18). */
  linkSala: string | null
  linkDisponivelEm: string | null
  podeCancelar: boolean
  canceladaPor: Perfil | null
  motivoCancelamento: string | null
  motivoReprovacao: string | null
  solicitacaoExame: { id: string; situacao: SituacaoExame } | null
}

// UC11 – exames solicitados ao paciente
export interface SolicitacaoExamePaciente {
  id: string
  exames: string[]
  orientacoes: string | null
  situacao: SituacaoExame
  criadoEm: string
  medico: { nome: string }
  consulta: { id: string; inicio: string }
  envios: EnvioExame[]
  /** Aguardando resultado ou reprovado (FA01: reenvio). */
  podeEnviar: boolean
}
