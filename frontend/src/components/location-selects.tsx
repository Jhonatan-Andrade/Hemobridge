import { useEffect, useId, useState } from 'react'
import { loadMunicipalities, loadStates } from '../services/ibge-localities'
import type { Municipality, State } from '../services/ibge-localities'
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
  const [states, setStates] = useState<State[]>([])
  const [municipalities, setMunicipalities] = useState<{ uf: string; items: Municipality[] }>({
    uf: '',
    items: [],
  })
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    loadStates(controller.signal)
      .then(setStates)
      .catch(() => {
        if (!controller.signal.aborted) setError('Estados indisponíveis. Tente novamente.')
      })
    return () => controller.abort()
  }, [attempt])
  useEffect(() => {
    if (!state) return
    const controller = new AbortController()
    loadMunicipalities(state, controller.signal)
      .then((items) => setMunicipalities({ uf: state, items }))
      .catch(() => {
        if (!controller.signal.aborted) setError('Municípios indisponíveis. Tente novamente.')
      })
    return () => controller.abort()
  }, [state, attempt])
  const items = municipalities.uf === state ? municipalities.items : []
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
            onChange={(e) => {
              setError('')
              onChange(e.target.value, '')
            }}
            aria-describedby={error ? `${id}-error` : undefined}
          >
            <option value="">{states.length ? 'Selecione o estado' : 'Carregando estados…'}</option>
            {states.map((item) => (
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
            disabled={!state || !items.length}
            onChange={(e) => onChange(state, e.target.value)}
          >
            <option value="">
              {!state
                ? 'Escolha primeiro o estado'
                : !items.length
                  ? 'Carregando municípios…'
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
              setError('')
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
