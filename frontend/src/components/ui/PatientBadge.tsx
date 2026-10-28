import type { SituacaoPaciente } from '../../api/types'

// Figma: PatientBadge (3:213) — status da conta do paciente.
const situacoes: Record<SituacaoPaciente, { texto: string; classes: string }> = {
  PENDENTE: { texto: 'Conta pendente', classes: 'bg-warning-bg text-warning' },
  ATIVA: { texto: 'Conta ativa · doador', classes: 'bg-success-bg text-success' },
}

export function PatientBadge({ situacao }: { situacao: SituacaoPaciente }) {
  const { texto, classes } = situacoes[situacao]
  return <p className={`w-55 max-w-full rounded-control p-2 text-caption ${classes}`}>● {texto}</p>
}
