// Figma: Button (3:92) — kinds Primary, Secondary e Destructive; estados Hover, Focus, Disabled e Loading.
// "editorial" é o Primary em coral usado sobre o fundo escuro da Home pública.
export type Kind = 'primary' | 'secondary' | 'destructive' | 'editorial'

const base =
  'inline-flex h-12 items-center justify-center gap-2 rounded-pill p-3 text-center text-label font-semibold transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-info ' +
  'disabled:cursor-not-allowed disabled:border-transparent disabled:bg-disabled disabled:text-muted'

const kinds: Record<Kind, string> = {
  primary: 'bg-brand text-surface hover:bg-brand-hover',
  secondary: 'border border-input bg-surface text-ink hover:bg-background',
  destructive: 'bg-error text-surface hover:bg-brand-hover',
  editorial: 'bg-coral text-surface hover:bg-brand-hover',
}

/** `block` ocupa toda a largura (botões de formulário); sem ele, a largura mínima é a do Figma (220px). */
export function buttonClasses(kind: Kind = 'primary', block = false, extra = '') {
  return `${base} ${kinds[kind]} ${block ? 'w-full' : 'w-full sm:w-auto sm:min-w-55 sm:self-start'} ${extra}`
}
