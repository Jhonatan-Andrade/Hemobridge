import type { ReactNode } from 'react'

// Figma: Card (3:233) — "Situation" usa o gradiente azul-petróleo; NextStep, Consultation e Empty usam superfície clara.
type Kind = 'situation' | 'default'

type CardProps = {
  kind?: Kind
  title: ReactNode
  children?: ReactNode
  className?: string
}

export function Card({ kind = 'default', title, children, className = '' }: CardProps) {
  const visual =
    kind === 'situation' ? 'bg-linear-to-br from-petrol-900 to-petrol-700 text-cream' : 'border border-line bg-surface text-ink'
  return (
    <section className={`flex flex-col gap-2 rounded-card p-4 shadow-surface ${visual} ${className}`}>
      <h2 className="text-section font-semibold">{title}</h2>
      {children && <div className={`text-body ${kind === 'situation' ? '' : 'text-muted'}`}>{children}</div>}
    </section>
  )
}

/** Painel branco das áreas de conteúdo (tabelas, gráficos, formulários laterais). */
export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`flex flex-col gap-4 rounded-panel bg-surface p-4 sm:p-5 ${className}`}>{children}</section>
}
