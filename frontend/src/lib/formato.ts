import type { NivelNecessidade, PapelEquipe, ResultadoDoacao, SituacaoPaciente, StatusAgendamento, StatusUsuario } from '../api/types'

// Os oito tipos ABO/Rh, na ordem de exibição.
export const TIPOS_SANGUINEOS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const

export const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const

// RF17, em ordem decrescente de prioridade.
export const NIVEIS: Record<NivelNecessidade, string> = {
  URGENTE: 'Urgente',
  NECESSARIO: 'Necessário',
  ESTAVEL: 'Estável',
}

export const SITUACOES_PACIENTE: Record<SituacaoPaciente, string> = {
  PENDENTE: 'Pendente',
  ATIVA: 'Ativa',
}

export const PAPEIS: Record<PapelEquipe, string> = {
  MEDICO: 'Médico',
  ADMIN_HEMOCENTRO: 'Admin do hemocentro',
}

export const STATUS_AGENDAMENTO: Record<StatusAgendamento, string> = {
  AGENDADO: 'Agendado',
  CANCELADO: 'Cancelado',
  CONCLUIDO: 'Atendido',
  AUSENTE: 'Não compareceu',
}

export const RESULTADOS_DOACAO: Record<ResultadoDoacao, string> = {
  DOOU: 'Doou',
  NAO_DOOU: 'Não doou',
  AUSENTE: 'Não compareceu',
}

export const DIAS_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'] as const

export const STATUS_USUARIO: Record<StatusUsuario, string> = {
  ATIVO: 'Ativo',
  INATIVO: 'Inativo',
  ENCERRADO: 'Encerrado',
}

export const somenteDigitos = (valor: string) => valor.replace(/\D/g, '')

export function mascaraCpf(valor: string) {
  const d = somenteDigitos(valor).slice(0, 11)
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2')
}

export function mascaraCnpj(valor: string) {
  const d = somenteDigitos(valor).slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export function mascaraTelefone(valor: string) {
  const d = somenteDigitos(valor).slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export function mascaraCep(valor: string) {
  const d = somenteDigitos(valor).slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

export function formatarDataHora(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export function formatarData(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

/** "seg., 26/10" a partir de uma data AAAA-MM-DD. */
export const formatarDiaCurto = (dataIso: string) =>
  new Date(`${dataIso}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })

/** "segunda-feira, 26 de outubro" a partir de uma data AAAA-MM-DD. */
export const formatarDiaLongo = (dataIso: string) =>
  new Date(`${dataIso}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

/** Data local AAAA-MM-DD (o fuso dos usuários é o de Brasília). */
export function dataLocalIso(data: Date = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${data.getFullYear()}-${p(data.getMonth() + 1)}-${p(data.getDate())}`
}

/** Soma dias a uma data AAAA-MM-DD. */
export function somarDias(dataIso: string, dias: number) {
  const d = new Date(`${dataIso}T12:00:00`)
  d.setDate(d.getDate() + dias)
  return dataLocalIso(d)
}

// Mínimo de 8 caracteres, com letra maiúscula, letra minúscula e número (RN06 do backend).
export const senhaValida = (senha: string) => /^(?=.*\p{Lu})(?=.*\p{Ll})(?=.*\d).{8,128}$/u.test(senha)
export const REGRA_SENHA = 'Mínimo de 8 caracteres, com letra maiúscula, letra minúscula e número.'
