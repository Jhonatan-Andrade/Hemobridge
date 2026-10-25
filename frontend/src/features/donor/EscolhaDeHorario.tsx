import { useMemo, useState, type ReactNode } from 'react'
import type { MedicoComHorarios } from '../../api/types'
import { EmptyState } from '../../components/ui'
import { dataLocalIso, formatarHora } from '../medico/rotulos'

export type Escolha = { id: string; inicio: string; fim: string; medico: MedicoComHorarios }

type Props = {
  medicos: MedicoComHorarios[]
  /** Mostra o médico e o local em cada horário (quando há mais de um local na lista). */
  mostrarLocal?: boolean
  /** Etapa 3: confirmação do horário escolhido. */
  renderConfirmacao: (escolha: Escolha) => ReactNode
}

/** UC09 passos 5–6: dia e horário entre os horários livres dos próximos 30 dias. */
export function EscolhaDeHorario({ medicos, mostrarLocal, renderConfirmacao }: Props) {
  const porDia = useMemo(() => {
    const dias = new Map<string, Escolha[]>()
    for (const medico of medicos) {
      for (const h of medico.horarios) {
        const dia = dataLocalIso(new Date(h.inicio))
        dias.set(dia, [...(dias.get(dia) ?? []), { ...h, medico }])
      }
    }
    return [...dias.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dia, lista]) => [dia, lista.sort((a, b) => a.inicio.localeCompare(b.inicio))] as const)
  }, [medicos])

  const [dia, setDia] = useState<string | null>(null)
  const [escolha, setEscolha] = useState<Escolha | null>(null)
  const diaAtivo = dia ?? porDia[0]?.[0] ?? null

  // FE01
  if (!porDia.length) {
    return (
      <EmptyState title="Nenhum horário disponível">
        Não há horários livres nos próximos 30 dias. Tente outro local ou volte mais tarde.
      </EmptyState>
    )
  }

  const rotuloDia = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-label font-semibold text-ink">1. Escolha o dia</legend>
        <div className="flex flex-wrap gap-2">
          {porDia.map(([iso, lista]) => (
            <button
              key={iso}
              type="button"
              aria-pressed={iso === diaAtivo}
              onClick={() => {
                setDia(iso)
                setEscolha(null)
              }}
              className={`rounded-pill border px-4 py-2 text-small font-semibold transition-colors ${
                iso === diaAtivo ? 'border-brand bg-brand text-surface' : 'border-input bg-surface text-ink hover:bg-background'
              }`}
            >
              {rotuloDia(iso)}
              <span className="sr-only">, {lista.length} {lista.length === 1 ? 'horário' : 'horários'}</span>
            </button>
          ))}
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
                aria-pressed={escolha?.id === h.id}
                onClick={() => setEscolha(h)}
                className={`flex flex-col items-start rounded-control border p-3 text-left transition-colors ${
                  escolha?.id === h.id ? 'border-2 border-brand bg-surface' : 'border-input bg-surface hover:bg-background'
                }`}
              >
                <span className="text-body font-semibold text-ink">
                  {formatarHora(h.inicio)}–{formatarHora(h.fim)}
                </span>
                <span className="text-small text-muted">{h.medico.nome}</span>
                {mostrarLocal && (
                  <span className="text-small text-muted">
                    {h.medico.hospital.nome} · {h.medico.hospital.cidade}/{h.medico.hospital.estado}
                  </span>
                )}
              </button>
            ))}
        </div>
      </fieldset>

      {escolha && <div key={escolha.id}>{renderConfirmacao(escolha)}</div>}
    </div>
  )
}
