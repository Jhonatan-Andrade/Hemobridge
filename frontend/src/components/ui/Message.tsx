import type { ReactNode } from 'react'

// Figma: Message (3:187) — tons Info, Error, Success e Warning.
type Tone = 'info' | 'error' | 'success' | 'warning'

const tons: Record<Tone, string> = {
  info: 'border-info bg-info-bg text-info',
  error: 'border-error bg-error-bg text-error',
  success: 'border-success bg-success-bg text-success',
  warning: 'border-warning bg-warning-bg text-warning',
}

export function Message({ tone = 'info', children }: { tone?: Tone; children: ReactNode }) {
  // Erros e avisos são anunciados imediatamente por leitores de tela.
  const urgente = tone === 'error' || tone === 'warning'
  return (
    <div role={urgente ? 'alert' : 'status'} className={`flex flex-col gap-2 rounded-control border p-4 text-body ${tons[tone]}`}>
      {children}
    </div>
  )
}
