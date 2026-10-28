import type { ReactNode } from 'react'
import { Button } from './Button'
import { Card } from './Card'
import { Message } from './Message'

/** Estado vazio: Card "Empty" do Figma. Diferente de uma falha ao carregar. */
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return <Card title={title}>{children}</Card>
}

/** Falha ao carregar, com opção de tentar de novo. */
export function ErrorState({ mensagens, onRetry }: { mensagens: string[]; onRetry?: () => void }) {
  return (
    <div className="flex flex-col gap-3">
      <Message tone="error">
        {mensagens.map((m) => (
          <p key={m}>! {m}</p>
        ))}
      </Message>
      {onRetry && (
        <Button kind="secondary" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  )
}
