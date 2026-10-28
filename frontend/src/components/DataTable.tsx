import type { ReactNode } from 'react'

export type Coluna<T> = {
  titulo: string
  /** Classe de largura da coluna no desktop (ex.: "w-75"). */
  largura?: string
  celula: (item: T) => ReactNode
}

type DataTableProps<T> = {
  legenda: string
  colunas: Coluna<T>[]
  itens: T[]
  chave: (item: T) => string
}

// Figma: DataTable (99:3151) — borda "line", cabeçalho em "background" e células de 13px.
// A primeira coluna identifica a linha. Abaixo de `sm` cada linha vira um bloco empilhado.
export function DataTable<T>({ legenda, colunas, itens, chave }: DataTableProps<T>) {
  const [primeira, ...demais] = colunas
  return (
    <div className="overflow-hidden rounded-control border border-line">
      <table className="w-full border-collapse text-left text-label">
        <caption className="sr-only">{legenda}</caption>
        <thead className="hidden bg-background font-semibold text-muted sm:table-header-group">
          <tr>
            {colunas.map((c) => (
              <th key={c.titulo} scope="col" className={`p-3 ${c.largura ?? ''}`}>
                {c.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {itens.map((item) => (
            <tr key={chave(item)} className="flex flex-col gap-1 border-t border-line p-3 first:border-t-0 sm:table-row sm:border-t-0 sm:p-0">
              <th scope="row" className="font-semibold text-ink sm:p-3 sm:font-normal">
                {primeira.celula(item)}
              </th>
              {demais.map((c) => (
                <td key={c.titulo} className="text-ink sm:p-3">
                  <span className="text-muted sm:hidden">{c.titulo}: </span>
                  {c.celula(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
