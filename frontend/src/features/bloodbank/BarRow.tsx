// Figma: linhas de gráfico do Painel do hospital (910:9922) — rótulo, trilho "line" de 10px e valor em "brand".
type BarRowProps = { rotulo: string; valor: number; maximo: number; tom?: 'brand' | 'error' | 'warning' | 'info' | 'success' | 'muted' }

const tons = {
  brand: 'bg-brand',
  error: 'bg-error',
  warning: 'bg-warning',
  info: 'bg-info',
  success: 'bg-success',
  muted: 'bg-muted',
}

export function BarRow({ rotulo, valor, maximo, tom = 'brand' }: BarRowProps) {
  const pct = maximo > 0 ? Math.min(100, (valor / maximo) * 100) : 0
  return (
    <li className="flex flex-col gap-1.5">
      <span className="text-body text-muted">{rotulo}</span>
      <span className="h-2.5 w-full overflow-hidden rounded-sm bg-line" aria-hidden="true">
        {/* Largura proporcional ao dado: valor dinâmico, por isso via style. */}
        <span className={`block h-full rounded-sm ${tons[tom]}`} style={{ width: `${pct}%` }} />
      </span>
    </li>
  )
}
