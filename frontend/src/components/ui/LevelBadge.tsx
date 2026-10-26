import type { NivelNecessidade } from '../../api/types'

// Figma: LevelBadge (98:3121). O símbolo e o texto comunicam o nível além da cor.
// Sem nível (null) = o hemocentro ainda não informou aquele tipo.
const niveis: Record<NivelNecessidade | 'NAO_INFORMADO', { texto: string; classes: string }> = {
  URGENTE: { texto: '! Urgente', classes: 'bg-error-bg text-error' },
  NECESSARIO: { texto: '↓ Necessário', classes: 'bg-warning-bg text-warning' },
  ESTAVEL: { texto: '= Estável', classes: 'bg-success-bg text-success' },
  NAO_INFORMADO: { texto: '? Não informado', classes: 'bg-background text-muted' },
}

export function LevelBadge({ level }: { level: NivelNecessidade | null }) {
  const { texto, classes } = niveis[level ?? 'NAO_INFORMADO']
  return (
    <span className={`inline-flex items-center justify-center whitespace-nowrap rounded-control px-3 py-2 text-small font-medium ${classes}`}>
      {texto}
    </span>
  )
}
