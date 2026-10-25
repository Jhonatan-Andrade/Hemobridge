import type { NivelNecessidade } from '../../api/types'

// Figma: LevelBadge (98:3121). O símbolo e o texto comunicam o nível além da cor.
const niveis: Record<NivelNecessidade, { texto: string; classes: string }> = {
  CRITICO: { texto: '! Crítico', classes: 'bg-error-bg text-error' },
  BAIXO: { texto: '↓ Baixo', classes: 'bg-warning-bg text-warning' },
  ESTAVEL: { texto: '= Estável', classes: 'bg-info-bg text-info' },
  ADEQUADO: { texto: '✓ Adequado', classes: 'bg-success-bg text-success' },
  NAO_INFORMADO: { texto: '? Não informado', classes: 'bg-background text-muted' },
}

export function LevelBadge({ level }: { level: NivelNecessidade }) {
  const { texto, classes } = niveis[level]
  return (
    <span className={`inline-flex items-center justify-center whitespace-nowrap rounded-control px-3 py-2 text-small font-medium ${classes}`}>
      {texto}
    </span>
  )
}
