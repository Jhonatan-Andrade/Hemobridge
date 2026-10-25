import type { SituacaoPaciente } from '../../api/types'

// Figma: PatientBadge (3:213) — situação do paciente no processo de aprovação.
const situacoes: Record<SituacaoPaciente, { texto: string; classes: string }> = {
  PRE_CADASTRADO: { texto: 'Pré-cadastrado', classes: 'bg-info-bg text-info' },
  CONSULTA_AGENDADA: { texto: 'Consulta agendada', classes: 'bg-info-bg text-info' },
  AGUARDANDO_EXAME: { texto: 'Aguardando exame', classes: 'bg-warning-bg text-warning' },
  EM_ANALISE: { texto: 'Em análise', classes: 'bg-warning-bg text-warning' },
  APROVADO: { texto: 'Aprovado', classes: 'bg-success-bg text-success' },
  REPROVADO: { texto: 'Reprovado', classes: 'bg-error-bg text-error' },
}

export function PatientBadge({ situacao }: { situacao: SituacaoPaciente }) {
  const { texto, classes } = situacoes[situacao]
  return <p className={`w-55 max-w-full rounded-control p-2 text-caption ${classes}`}>● {texto}</p>
}
