import type { NivelNecessidade, Papel, Perfil, SituacaoPaciente, StatusUsuario } from '../api/types'

// RN01: os oito tipos ABO/Rh, na ordem de exibição.
export const TIPOS_SANGUINEOS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const

export const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const

// RN02, em ordem decrescente de prioridade.
export const NIVEIS: Record<NivelNecessidade, string> = {
  CRITICO: 'Crítico',
  BAIXO: 'Baixo',
  ESTAVEL: 'Estável',
  ADEQUADO: 'Adequado',
  NAO_INFORMADO: 'Não informado',
}

export const SITUACOES_PACIENTE: Record<SituacaoPaciente, string> = {
  PRE_CADASTRADO: 'Pré-cadastrado',
  CONSULTA_AGENDADA: 'Consulta agendada',
  AGUARDANDO_EXAME: 'Aguardando exame',
  EM_ANALISE: 'Em análise',
  APROVADO: 'Aprovado',
  REPROVADO: 'Reprovado',
}

export const PAPEIS: Record<Papel, string> = {
  PACIENTE: 'Paciente',
  DOADOR: 'Doador',
  MEDICO: 'Médico',
  REPRESENTANTE: 'Representante',
  ADMINISTRADOR: 'Administrador',
}

export const PERFIS: Record<Perfil, string> = {
  PACIENTE: 'Paciente',
  MEDICO: 'Médico',
  REPRESENTANTE: 'Representante',
  ADMINISTRADOR: 'Administrador',
}

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

/** Idade completa em anos a partir de uma data AAAA-MM-DD. */
export function calcularIdade(dataIso: string) {
  const [ano, mes, dia] = dataIso.split('-').map(Number)
  if (!ano || !mes || !dia) return null
  const hoje = new Date()
  let idade = hoje.getFullYear() - ano
  if (hoje.getMonth() + 1 < mes || (hoje.getMonth() + 1 === mes && hoje.getDate() < dia)) idade--
  return idade
}

// RN06: mínimo de 8 caracteres, com letra maiúscula, letra minúscula e número.
export const senhaValida = (senha: string) => /^(?=.*\p{Lu})(?=.*\p{Ll})(?=.*\d).{8,128}$/u.test(senha)
export const REGRA_SENHA = 'Mínimo de 8 caracteres, com letra maiúscula, letra minúscula e número.'
