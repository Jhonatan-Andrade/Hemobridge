import { Button } from './Button'

type PaginationProps = { pagina: number; total: number; tamanhoPagina: number; onChange: (pagina: number) => void }

/** Anterior / Próxima com a página atual; some quando há uma página só. */
export function Pagination({ pagina, total, tamanhoPagina, onChange }: PaginationProps) {
  const totalPaginas = Math.max(1, Math.ceil(total / tamanhoPagina))
  if (totalPaginas <= 1) return null
  return (
    <nav aria-label="Paginação" className="flex items-center justify-between gap-3">
      <Button kind="secondary" disabled={pagina <= 1} onClick={() => onChange(pagina - 1)}>
        Anterior
      </Button>
      <p className="text-small text-muted">
        Página {pagina} de {totalPaginas}
      </p>
      <Button kind="secondary" disabled={pagina >= totalPaginas} onClick={() => onChange(pagina + 1)}>
        Próxima
      </Button>
    </nav>
  )
}
