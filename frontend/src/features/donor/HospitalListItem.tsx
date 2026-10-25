import { Link } from 'react-router-dom'
import type { HospitalResumo } from '../../api/types'
import { LevelBadge } from '../../components/ui'
import { NIVEIS } from '../../lib/formato'
import { formatarDistancia, necessidadesPrioritarias } from './hospitalUtils'

type Props = {
  hospital: HospitalResumo
  /** Tipo do doador: mostra "O+ · Crítico · 2,4 km" como no Figma. */
  tipo?: string | null
  /** Dentro de um Panel branco, o item usa o fundo claro (Figma: cards de serviço em Encontrar locais). */
  fundo?: 'surface' | 'background'
}

// Figma: "Lista priorizada" em Locais / Recomendações (906:9971).
export function HospitalListItem({ hospital, tipo, fundo = 'surface' }: Props) {
  const distancia = formatarDistancia(hospital.distanciaKm)
  const doTipo = tipo ? hospital.necessidades.find((n) => n.tipo === tipo) : undefined
  // Com o tipo do doador o texto já informa o nível (Figma); sem ele, mostra as necessidades mais urgentes.
  const destaques = doTipo ? [] : necessidadesPrioritarias(hospital)

  return (
    <li>
      <Link
        to={`/locais/${hospital.id}`}
        className={`flex flex-col gap-2 rounded-panel p-4 transition-shadow hover:shadow-surface ${fundo === 'surface' ? 'bg-surface' : 'bg-background'}`}
      >
        <h3 className="text-section font-semibold text-ink">{hospital.nome}</h3>
        <p className="text-body text-muted">
          {doTipo ? `${doTipo.tipo} · ${NIVEIS[doTipo.nivel]}` : 'Necessidades atuais'}
          {distancia && ` · ${distancia}`}
          <br />
          {hospital.cidade}/{hospital.estado}
        </p>
        {destaques.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Necessidades por tipo sanguíneo">
            {destaques.map((n) => (
              <li key={n.tipo} className="flex items-center gap-2 text-small font-semibold text-ink">
                {n.tipo} <LevelBadge level={n.nivel} />
              </li>
            ))}
          </ul>
        )}
      </Link>
    </li>
  )
}
