import type { Sexo, SituacaoConsulta, SituacaoExame } from '../../api/types'

export const SITUACOES_CONSULTA: Record<SituacaoConsulta, string> = {
  AGENDADA: 'Agendada',
  REALIZADA: 'Realizada',
  NAO_COMPARECEU: 'Não compareceu',
  CANCELADA: 'Cancelada',
}

export const SITUACOES_EXAME: Record<SituacaoExame, string> = {
  AGUARDANDO_RESULTADO: 'Aguardando resultado',
  EM_ANALISE: 'Em análise',
  REPROVADO: 'Reprovado',
  VALIDADO: 'Validado',
}

export const SEXOS: Record<Sexo, string> = { MASCULINO: 'Masculino', FEMININO: 'Feminino' }

/** Cor do rótulo de situação, como nos cards do Figma (vermelho para o que pede ação, verde para concluído). */
export function corSituacao(situacao: SituacaoConsulta | SituacaoExame) {
  if (situacao === 'REALIZADA' || situacao === 'VALIDADO') return 'text-success'
  if (situacao === 'CANCELADA' || situacao === 'NAO_COMPARECEU' || situacao === 'REPROVADO') return 'text-muted'
  return 'text-brand'
}

export const formatarHora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

/** "18/10/2026 · 10:00–10:30" */
export function formatarHorario(inicio: string, fim: string) {
  return `${new Date(inicio).toLocaleDateString('pt-BR')} · ${formatarHora(inicio)}–${formatarHora(fim)}`
}

/** Data local AAAA-MM-DD (a agenda usa o fuso de Brasília, o mesmo do navegador dos usuários). */
export function dataLocalIso(data: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${data.getFullYear()}-${p(data.getMonth() + 1)}-${p(data.getDate())}`
}
