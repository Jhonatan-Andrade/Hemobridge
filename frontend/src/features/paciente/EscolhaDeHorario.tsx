import { useMemo, useState, type ReactNode } from 'react'
import type { HorarioDisponivel } from '../../api/types'
import { EmptyState } from '../../components/ui'
import { formatarDiaCurto } from '../../lib/formato'

type Props = {
  horarios: HorarioDisponivel[]
  /** Etapa 3: confirmação do horário escolhido. */
  renderConfirmacao: (horario: HorarioDisponivel) => ReactNode
}

/** RF05: horários por data com os agendados sobre o limite ("2/6 agendados"); lotados ficam indisponíveis. */
export function EscolhaDeHorario({ horarios, renderConfirmacao }: Props) {
  const porDia = useMemo(() => {
    const dias = new Map<string, HorarioDisponivel[]>()
    for (const h of horarios) dias.set(h.data, [...(dias.get(h.data) ?? []), h])
    return [...dias.entries()]
  }, [horarios])

  const [dia, setDia] = useState<string | null>(null)
  const [escolhido, setEscolhido] = useState<HorarioDisponivel | null>(null)
  const diaAtivo = dia ?? porDia.find(([, lista]) => lista.some((h) => h.disponivel))?.[0] ?? porDia[0]?.[0] ?? null

  if (!porDia.length) {
    return <EmptyState title="Nenhum horário disponível">Não há horários abertos nos próximos 30 dias. Tente outro hemocentro ou volte mais tarde.</EmptyState>
  }

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-label font-semibold text-ink">1. Escolha o dia</legend>
        <div className="flex flex-wrap gap-2">
          {porDia.map(([iso, lista]) => {
            const livres = lista.filter((h) => h.disponivel).length
            return (
              <button
                key={iso}
                type="button"
                aria-pressed={iso === diaAtivo}
                onClick={() => {
                  setDia(iso)
                  setEscolhido(null)
                }}
                className={`rounded-pill border px-4 py-2 text-small font-semibold transition-colors ${
                  iso === diaAtivo ? 'border-brand bg-brand text-surface' : 'border-input bg-surface text-ink hover:bg-background'
                }`}
              >
                {formatarDiaCurto(iso)}
                <span className="sr-only">, {livres ? `${livres} ${livres === 1 ? 'horário com vaga' : 'horários com vaga'}` : 'esgotado'}</span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-label font-semibold text-ink">2. Escolha o horário</legend>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {porDia
            .find(([iso]) => iso === diaAtivo)?.[1]
            .map((h) => (
              <button
                key={h.id}
                type="button"
                disabled={!h.disponivel}
                aria-pressed={escolhido?.id === h.id}
                onClick={() => setEscolhido(h)}
                className={`flex flex-col items-start rounded-control border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:bg-background ${
                  escolhido?.id === h.id ? 'border-2 border-brand bg-surface' : 'border-input bg-surface hover:bg-background'
                }`}
              >
                <span className={`text-body font-semibold ${h.disponivel ? 'text-ink' : 'text-muted line-through'}`}>
                  {h.horaInicio}–{h.horaFim}
                </span>
                <span className={`text-small ${h.disponivel ? 'text-muted' : 'font-semibold text-error'}`}>
                  {`${h.vagasTotal - h.vagasRestantes}/${h.vagasTotal} agendados`}
                  {!h.disponivel && ' · Esgotado'}
                </span>
              </button>
            ))}
        </div>
      </fieldset>

      {escolhido && <div key={escolhido.id}>{renderConfirmacao(escolhido)}</div>}
    </div>
  )
}
