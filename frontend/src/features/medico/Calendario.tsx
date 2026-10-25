import { useState } from 'react'
import { dataLocalIso } from './rotulos'

const DIAS_SEMANA = [
  ['Seg', 'segunda'],
  ['Ter', 'terça'],
  ['Qua', 'quarta'],
  ['Qui', 'quinta'],
  ['Sex', 'sexta'],
  ['Sáb', 'sábado'],
  ['Dom', 'domingo'],
] as const

type Props = {
  selecionada: string
  onSelecionar: (data: string) => void
  /** Datas (AAAA-MM-DD) que já têm horários publicados. */
  comHorarios: Set<string>
}

/** Seis semanas a partir da segunda-feira anterior ao dia 1º do mês. */
function semanasDoMes(ano: number, mes: number) {
  const primeiro = new Date(ano, mes, 1)
  const inicio = new Date(ano, mes, 1 - ((primeiro.getDay() + 6) % 7))
  return Array.from({ length: 6 }, (_, s) =>
    Array.from({ length: 7 }, (_, d) => new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + s * 7 + d)),
  )
}

// Figma: Web desktop / Médico / Agenda / Próximos (101:3115) — calendário do período de atendimento.
export function Calendario({ selecionada, onSelecionar, comHorarios }: Props) {
  const [ano, mes] = selecionada.split('-').map(Number)
  const [visivel, setVisivel] = useState({ ano, mes: mes - 1 })
  const hoje = dataLocalIso(new Date())
  const titulo = new Date(visivel.ano, visivel.mes, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const mudarMes = (delta: number) => {
    const d = new Date(visivel.ano, visivel.mes + delta, 1)
    setVisivel({ ano: d.getFullYear(), mes: d.getMonth() })
  }
  const noMesAtual = visivel.ano === new Date().getFullYear() && visivel.mes === new Date().getMonth()

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-section font-semibold text-ink first-letter:uppercase" aria-live="polite">
          {titulo}
        </h2>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => mudarMes(-1)}
            disabled={noMesAtual}
            className="size-10 rounded-full border border-input text-ink hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Mês anterior"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => mudarMes(1)}
            className="size-10 rounded-full border border-input text-ink hover:bg-background"
            aria-label="Próximo mês"
          >
            ›
          </button>
        </div>
      </div>
      <p className="text-body text-muted">Escolha a data do período de atendimento.</p>

      <table className="w-full table-fixed border-separate border-spacing-1">
        <caption className="sr-only">Calendário de {titulo}</caption>
        <thead>
          <tr>
            {DIAS_SEMANA.map(([curto, longo]) => (
              <th key={curto} scope="col" className="pb-1 text-small font-normal text-muted">
                <abbr title={longo} className="no-underline">
                  {curto}
                </abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {semanasDoMes(visivel.ano, visivel.mes).map((semana) => (
            <tr key={dataLocalIso(semana[0])}>
              {semana.map((dia) => {
                const iso = dataLocalIso(dia)
                const ativo = iso === selecionada
                const passado = iso < hoje
                const foraDoMes = dia.getMonth() !== visivel.mes
                return (
                  <td key={iso} className="text-center">
                    <button
                      type="button"
                      onClick={() => onSelecionar(iso)}
                      disabled={passado}
                      aria-pressed={ativo}
                      aria-label={`${dia.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}${comHorarios.has(iso) ? ', com horários publicados' : ''}`}
                      className={`relative mx-auto flex aspect-square w-full max-w-11 items-center justify-center rounded-full border text-small font-semibold transition-colors ${
                        ativo
                          ? 'border-brand bg-brand text-surface'
                          : `border-input bg-surface hover:bg-background ${foraDoMes ? 'text-muted' : 'text-ink'}`
                      } disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      {dia.getDate()}
                      {comHorarios.has(iso) && (
                        <span aria-hidden className={`absolute bottom-1 size-1.5 rounded-full ${ativo ? 'bg-surface' : 'bg-brand'}`} />
                      )}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
