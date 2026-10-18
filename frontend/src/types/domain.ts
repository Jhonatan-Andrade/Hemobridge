export type Identity = 'visitor' | 'patient' | 'professional'
export type ProfessionalRole = 'doctor' | 'representative' | 'administrator'
export type CommunityParticipantRole = 'patient' | ProfessionalRole
export type CommunityAuthorRole = CommunityParticipantRole | 'editorial' | 'institution'
export type RequestState = 'loading' | 'success' | 'loadError'
export type PatientStatus =
  | 'PRE_CADASTRADO'
  | 'CONSULTA_AGENDADA'
  | 'AGUARDANDO_EXAME'
  | 'EM_ANALISE'
  | 'APROVADO'
  | 'REPROVADO'
export type UserRole = 'PACIENTE' | 'MEDICO' | 'REPRESENTANTE' | 'ADMINISTRADOR'
export interface SessionUser {
  id: string
  nome: string
  email: string
  perfil: UserRole
  papel: UserRole | 'DOADOR'
  senhaProvisoria: boolean
}
export interface UserProfile {
  name: string
  cpf: string
  email: string
  phone: string
  birth: string
  sex: string
  weight: string
  city: string
  state: string
  status: PatientStatus
  bloodType: string | null
}
export interface Comment {
  id: string
  author: string
  date: string
  text: string
  role?: CommunityAuthorRole
  verified?: boolean
}
export interface Publication {
  id: string
  author: string
  date: string
  title: string
  content: string
  likes: number
  liked: boolean
  comments: Comment[]
  commentsTotal: number
  role: CommunityAuthorRole
  verified: boolean
  pinned: boolean
  pinnedUntil?: string
  topic: string
  image?: boolean
}
export const communityRoleLabels: Record<CommunityAuthorRole, string> = {
  patient: 'Paciente/Doador',
  doctor: 'Médico',
  representative: 'Representante de Hospital',
  administrator: 'Administrador',
  editorial: 'HemoBridge',
  institution: 'Instituição',
}
export const statusLabels: Record<PatientStatus, string> = {
  PRE_CADASTRADO: 'Pré-cadastrado',
  CONSULTA_AGENDADA: 'Consulta agendada',
  AGUARDANDO_EXAME: 'Aguardando exame',
  EM_ANALISE: 'Em análise',
  APROVADO: 'Aprovado',
  REPROVADO: 'Não aprovado',
}
export const professionalRoleOf = (u: SessionUser | null): ProfessionalRole =>
  u?.perfil === 'REPRESENTANTE'
    ? 'representative'
    : u?.perfil === 'ADMINISTRADOR'
      ? 'administrator'
      : 'doctor'
export const entryRouteOf = (u: SessionUser) =>
  u.senhaProvisoria
    ? 'first'
    : u.perfil === 'PACIENTE'
      ? 'dashboard'
      : u.perfil === 'REPRESENTANTE'
        ? 'professional/needs'
        : u.perfil === 'ADMINISTRADOR'
          ? 'professional/admin'
          : 'professional'
