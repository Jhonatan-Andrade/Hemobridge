import { useEffect, useId, useState } from 'react'
import { loadMunicipalities, loadStates } from '../services/ibge-localities'
import type { Municipality, State } from '../services/ibge-localities'

type Localities<T> = { items: T[]; status: 'loading' | 'ready' | 'error' }

export function LocationSelects({
  state,
  city,
  onChange,
  required = false,
}: {
  state: string
  city: string
  onChange: (state: string, city: string) => void
  required?: boolean
}) {
  const id = useId()
  const [states, setStates] = useState<Localities<State>>({ items: [], status: 'loading' })
  const [municipalities, setMunicipalities] = useState<Localities<Municipality> & { key: string }>({
    key: '',
    items: [],
    status: 'loading',
  })
  const [attempt, setAttempt] = useState(0)
  const key = `${state}:${attempt}`
  useEffect(() => {
    const controller = new AbortController()
    loadStates(controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) setStates({ items, status: 'ready' })
      })
      .catch(() => {
        if (!controller.signal.aborted) setStates({ items: [], status: 'error' })
      })
    return () => controller.abort()
  }, [attempt])
  useEffect(() => {
    if (!state) return
    const controller = new AbortController()
    loadMunicipalities(state, controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) setMunicipalities({ key, items, status: 'ready' })
      })
      .catch(() => {
        if (!controller.signal.aborted) setMunicipalities({ key, items: [], status: 'error' })
      })
    return () => controller.abort()
  }, [state, key])
  const current = municipalities.key === key ? municipalities : undefined
  const items = current?.items ?? []
  const cityLoading = !!state && (!current || current.status === 'loading')
  const error =
    states.status === 'error'
      ? 'Estados indisponíveis. Tente novamente.'
      : state && current?.status === 'error'
        ? 'Municípios indisponíveis. Tente novamente.'
        : ''
  const errorId = error ? `${id}-error` : undefined
  return (
    <fieldset className="location-selects">
      <legend>Localidade</legend>
      <div className="field-grid">
        <div className="field">
          <label htmlFor={`${id}-state`}>Estado</label>
          <select
            id={`${id}-state`}
            required={required}
            value={state}
            disabled={states.status !== 'ready' || !states.items.length}
            aria-busy={states.status === 'loading'}
            aria-describedby={errorId}
            onChange={(e) => onChange(e.target.value, '')}
          >
            <option value="">
              {states.status === 'loading'
                ? 'Carregando estados…'
                : states.status === 'error'
                  ? 'Estados indisponíveis'
                  : !states.items.length
                    ? 'Nenhum estado disponível'
                    : 'Selecione o estado'}
            </option>
            {states.items.map((item) => (
              <option key={item.id} value={item.sigla}>
                {item.nome} ({item.sigla})
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${id}-city`}>Município</label>
          <select
            id={`${id}-city`}
            required={required}
            value={city}
            disabled={!state || cityLoading || !items.length}
            aria-busy={cityLoading}
            aria-describedby={errorId}
            onChange={(e) => onChange(state, e.target.value)}
          >
            <option value="">
              {!state
                ? 'Escolha primeiro o estado'
                : cityLoading
                  ? 'Carregando municípios…'
                  : current?.status === 'error'
                    ? 'Municípios indisponíveis'
                    : !items.length
                      ? 'Nenhum município disponível'
                      : 'Selecione o município'}
            </option>
            {items.map((item) => (
              <option key={item.id} value={item.nome}>
                {item.nome}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert">
          {error}{' '}
          <button
            type="button"
            className="text-button"
            onClick={() => {
              if (states.status === 'error') setStates({ items: [], status: 'loading' })
              setAttempt((v) => v + 1)
            }}
          >
            Tentar novamente
          </button>
        </p>
      )}
    </fieldset>
  )
}
