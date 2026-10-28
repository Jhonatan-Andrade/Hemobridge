// Figma: Loading (3:246).
export function Loading({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <div role="status" aria-live="polite" className="w-full rounded-control bg-surface p-4 text-label font-medium text-muted">
      ◌ {texto}
    </div>
  )
}
