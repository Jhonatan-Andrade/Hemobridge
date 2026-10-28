import type { NecessidadeTipo } from '../api/types'
import { formatarDataHora } from '../lib/formato'
import { LevelBadge } from './ui'

type NeedsTableProps = {
  necessidades: NecessidadeTipo[]
  legenda: string
  /** Tipo do paciente logado, destacado na tabela. */
  destaque?: string | null
}

// Figma: "Oito tipos sanguíneos" (104:3280). Abaixo de `sm` a tabela vira uma lista para caber em 360px.
export function NeedsTable({ necessidades, legenda, destaque }: NeedsTableProps) {
  return (
    <table className="w-full border-collapse text-left">
      <caption className="sr-only">{legenda}</caption>
      <thead className="hidden bg-background text-small font-semibold text-muted sm:table-header-group">
        <tr>
          <th scope="col" className="w-30 p-3">
            Tipo
          </th>
          <th scope="col" className="w-50 p-3">
            Nível
          </th>
          <th scope="col" className="p-3">
            Atualizado em
          </th>
        </tr>
      </thead>
      <tbody>
        {necessidades.map((n) => (
          <tr
            key={n.tipo}
            className={`flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line py-3 last:border-0 sm:table-row sm:border-0 ${
              n.tipo === destaque ? 'bg-info-bg' : ''
            }`}
          >
            <th scope="row" className="w-16 text-body font-semibold text-ink sm:p-2.5">
              {n.tipo.replace('-', '−')}
              {n.tipo === destaque && <span className="block text-caption font-medium text-info">seu tipo</span>}
            </th>
            <td className="sm:p-2.5">
              <LevelBadge level={n.nivel} />
            </td>
            <td className="basis-full text-small text-muted sm:basis-auto sm:p-2.5">
              <span className="sm:hidden">Atualizado em </span>
              {formatarDataHora(n.atualizadoEm)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
