import { Link } from 'react-router-dom'
import type { HemocentroResumo, NivelNecessidade } from '../../api/types'
import { LevelBadge } from '../../components/ui'

const PRIORIDADE: NivelNecessidade[] = ['URGENTE', 'NECESSARIO', 'ESTAVEL']

type Props = {
  hemocentro: HemocentroResumo
  /** Tipo do paciente logado: o hemocentro que precisa dele ganha destaque (RF18). */
  tipo?: string | null
  fundo?: 'surface' | 'background'
}

// Figma: "Lista priorizada" em Locais (906:9971), adaptada aos hemocentros.
export function HemocentroCard({ hemocentro: h, tipo, fundo = 'surface' }: Props) {
  const destaques = [...h.necessidades].sort((a, b) => PRIORIDADE.indexOf(a.nivel) - PRIORIDADE.indexOf(b.nivel)).slice(0, 4)

  return (
    <li>
      <Link
        to={`/doar/${h.id}`}
        className={`flex flex-col gap-2 rounded-panel border-2 p-4 transition-shadow hover:shadow-surface ${
          h.precisaDoTipo ? 'border-brand' : 'border-transparent'
        } ${fundo === 'surface' ? 'bg-surface' : 'bg-background'}`}
      >
        {h.precisaDoTipo && tipo && <p className="text-small font-semibold uppercase text-brand">Precisa do seu tipo {tipo}</p>}
        <h3 className="text-section font-semibold text-ink">{h.nome}</h3>
        <p className="text-body text-muted">
          {h.endereco} · {h.cidade}/{h.estado}
        </p>
        {destaques.length > 0 ? (
          <ul className="flex flex-wrap gap-2" aria-label="Necessidades por tipo sanguíneo">
            {destaques.map((n) => (
              <li key={n.tipo} className="flex items-center gap-2 text-small font-semibold text-ink">
                {n.tipo} <LevelBadge level={n.nivel} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-small text-muted">Necessidades ainda não informadas.</p>
        )}
      </Link>
    </li>
  )
}
