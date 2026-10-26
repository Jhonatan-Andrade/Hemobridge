import { useState } from 'react'
import type { FormEvent } from 'react'
import { api, messageOf } from '../services/api-client'
import { useResource } from '../services/use-resource'
import { Alert } from './ui'

type Donor = { id: string; nome: string; tipo: string }
type Search = { encontrado: true; doador: Donor } | { encontrado: false; mensagem: string }
type Donation = {
  id: string
  avulsa: boolean
  doador: string | null
  tipo: string
  dataColeta: string
  pesoAferido: number | null
  registradoPor: string
}
type DonationList = { itens: Donation[]; total: number; pagina: number; tamanhoPagina: number }
type Saved = { mensagem: string; avisos: string[] }
const bloodTypes = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']
const today = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
const dateLabel = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(`${value}T12:00:00Z`))

/** Identificação e confirmação da coleta separadas da atualização de necessidades. */
export function DonationRegistration() {
  const [mode, setMode] = useState<'linked' | 'anonymous'>('linked')
  const [cpf, setCpf] = useState('')
  const [search, setSearch] = useState<Search | null>(null)
  const [date, setDate] = useState(today)
  const [weight, setWeight] = useState('')
  const [bloodType, setBloodType] = useState('')
  const [guardian, setGuardian] = useState(false)
  const [beforeSixty, setBeforeSixty] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState<Saved | null>(null)
  const [filters, setFilters] = useState({ de: '', ate: '' })
  const [page, setPage] = useState(1)
  const query = new URLSearchParams({
    pagina: String(page),
    tamanhoPagina: '10',
    ...(filters.de ? { de: filters.de } : {}),
    ...(filters.ate ? { ate: filters.ate } : {}),
  })
  const list = useResource<DonationList>(`/representante/doacoes?${query}`)
  const donor = search?.encontrado ? search.doador : null

  function chooseMode(value: 'linked' | 'anonymous') {
    if (busy) return
    setMode(value)
    setConfirmed(false)
    setGuardian(false)
    setBeforeSixty(false)
    setError('')
    setSaved(null)
  }
  async function lookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setSearch(null)
    setError('')
    setSaved(null)
    setConfirmed(false)
    try {
      setSearch(
        await api<Search>('/representante/doacoes/buscar-doador', {
          method: 'POST',
          body: { cpf },
        }),
      )
    } catch (failure) {
      setError(messageOf(failure))
    } finally {
      setBusy(false)
    }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !confirmed || (mode === 'linked' && !donor)) return
    setBusy(true)
    setError('')
    setSaved(null)
    try {
      const result = await api<Saved>(
        `/representante/doacoes${mode === 'anonymous' ? '/avulsa' : ''}`,
        {
          method: 'POST',
          body:
            mode === 'anonymous'
              ? { dataColeta: date, tipo: bloodType }
              : {
                  pacienteId: donor!.id,
                  dataColeta: date,
                  pesoAferido: Number(weight),
                  autorizacaoResponsavelConfirmada: guardian,
                  doouAntesDos60Confirmado: beforeSixty,
                },
        },
      )
      setSaved(result)
      setConfirmed(false)
      setGuardian(false)
      setBeforeSixty(false)
      setWeight('')
      setCpf('')
      setSearch(null)
      setBloodType('')
      setPage(1)
      list.reload()
    } catch (failure) {
      setError(messageOf(failure))
    } finally {
      setBusy(false)
    }
  }
  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    const de = String(values.get('de') ?? ''),
      ate = String(values.get('ate') ?? '')
    if (de && ate && de > ate) {
      setError('A data inicial do histórico deve ser anterior à data final.')
      return
    }
    setFilters({ de, ate })
    setPage(1)
    setError('')
  }
  return (
    <div className="exam-review-list">
      <section className="hb-pro-card" aria-labelledby="donation-title">
        <h2 id="donation-title">Registrar doação</h2>
        <p>
          Identifique o doador aprovado e informe os dados conferidos na triagem. A avaliação
          considera o peso aferido e o histórico registrado no HemoBridge.
        </p>
        <div className="actions" aria-label="Forma de registro">
          <button
            type="button"
            className={`button ${mode === 'linked' ? '' : 'secondary'}`}
            aria-pressed={mode === 'linked'}
            disabled={busy}
            onClick={() => chooseMode('linked')}
          >
            Doador cadastrado
          </button>
          <button
            type="button"
            className={`button ${mode === 'anonymous' ? '' : 'secondary'}`}
            aria-pressed={mode === 'anonymous'}
            disabled={busy}
            onClick={() => chooseMode('anonymous')}
          >
            Doação avulsa
          </button>
        </div>
        {mode === 'linked' ? (
          <>
            <form className="exam-review-fields" onSubmit={lookup}>
              <label>
                CPF apresentado na triagem
                <input
                  value={cpf}
                  onChange={(e) => {
                    setCpf(e.target.value)
                    setSearch(null)
                    setWeight('')
                    setConfirmed(false)
                    setGuardian(false)
                    setBeforeSixty(false)
                  }}
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={14}
                  required
                  disabled={busy}
                />
              </label>
              <button className="button secondary" disabled={busy || !cpf.trim()}>
                {busy ? 'Aguarde…' : 'Localizar doador'}
              </button>
            </form>
            {search && !search.encontrado && (
              <Alert>
                {search.mensagem}{' '}
                <button
                  type="button"
                  className="text-button"
                  onClick={() => chooseMode('anonymous')}
                >
                  Escolher registro avulso
                </button>
              </Alert>
            )}
            {donor && (
              <Alert>
                <strong>{donor.nome}</strong> · Tipo sanguíneo validado:{' '}
                <strong>{donor.tipo}</strong>. Confira a identidade antes de registrar.
              </Alert>
            )}
          </>
        ) : (
          <Alert>
            Registro sem vínculo com cadastro, para fins estatísticos. A elegibilidade e a tipagem
            devem ser conferidas pela triagem do hemocentro. Para um doador identificado e aprovado,
            escolha “Doador cadastrado”.
          </Alert>
        )}
        {(mode === 'anonymous' || donor) && (
          <form className="exam-review-fields" onSubmit={save}>
            <label>
              Data da coleta
              <input
                type="date"
                required
                max={today()}
                value={date}
                onChange={(e) => {
                  setDate(e.target.value)
                  setConfirmed(false)
                }}
                disabled={busy}
              />
            </label>
            {mode === 'linked' ? (
              <>
                <label>
                  Peso aferido na triagem (kg)
                  <input
                    type="number"
                    min="1"
                    max="400"
                    step="0.01"
                    inputMode="decimal"
                    required
                    value={weight}
                    onChange={(e) => {
                      setWeight(e.target.value)
                      setConfirmed(false)
                    }}
                    disabled={busy}
                  />
                </label>
                <p>
                  Para menores de 18 anos, é obrigatória a autorização formal do responsável. Para
                  pessoas de 61 a 69 anos, é necessário comprovar doação antes dos 60 anos, por
                  histórico na plataforma ou confirmação da triagem.
                </p>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={guardian}
                    onChange={(e) => {
                      setGuardian(e.target.checked)
                      setConfirmed(false)
                    }}
                    disabled={busy}
                  />
                  Quando aplicável: a autorização formal do responsável foi apresentada na triagem.
                </label>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={beforeSixty}
                    onChange={(e) => {
                      setBeforeSixty(e.target.checked)
                      setConfirmed(false)
                    }}
                    disabled={busy}
                  />
                  Quando aplicável: a triagem confirmou que o doador já doou antes dos 60 anos.
                </label>
              </>
            ) : (
              <label>
                Tipo sanguíneo conferido na triagem
                <select
                  required
                  value={bloodType}
                  onChange={(e) => {
                    setBloodType(e.target.value)
                    setConfirmed(false)
                  }}
                  disabled={busy}
                >
                  <option value="">Selecione</option>
                  {bloodTypes.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="checkbox-row">
              <input
                type="checkbox"
                required
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                disabled={busy}
              />
              Conferi os dados e a triagem clínica e confirmo o registro desta coleta.
            </label>
            <button className="button" disabled={busy || !confirmed}>
              {busy ? 'Registrando…' : 'Confirmar registro de doação'}
            </button>
          </form>
        )}
        {error && <Alert tone="error">{error}</Alert>}
        {saved && (
          <Alert tone="success">
            <strong>{saved.mensagem}</strong>
            {saved.avisos.map((notice) => (
              <p key={notice}>{notice}</p>
            ))}
          </Alert>
        )}
        <p className="muted">
          O registro preserva o histórico do doador e não atualiza automaticamente os níveis de
          necessidade ou o estoque de bolsas.
        </p>
      </section>
      <section className="hb-pro-card" aria-labelledby="donation-history-title">
        <h2 id="donation-history-title">Doações da instituição</h2>
        <form className="exam-review-fields" onSubmit={filter}>
          <label>
            Coletas a partir de
            <input type="date" name="de" max={today()} />
          </label>
          <label>
            Coletas até
            <input type="date" name="ate" max={today()} />
          </label>
          <button className="button secondary" disabled={busy}>
            Filtrar histórico
          </button>
        </form>
        {list.loading ? (
          <p role="status">Carregando doações…</p>
        ) : list.error ? (
          <Alert tone="error">
            {list.error}{' '}
            <button type="button" className="text-button" onClick={list.reload}>
              Tentar novamente
            </button>
          </Alert>
        ) : (
          <>
            <p>{list.data?.total ?? 0} registro(s) no período.</p>
            {list.data?.itens.length ? (
              <ul className="exam-review-list">
                {list.data.itens.map((item) => (
                  <li className="exam-review" key={item.id}>
                    <h3>{item.avulsa ? 'Doação avulsa' : item.doador}</h3>
                    <p>
                      Coleta: {dateLabel(item.dataColeta)} · Tipo: <strong>{item.tipo}</strong>
                      {item.pesoAferido !== null
                        ? ` · Peso aferido: ${item.pesoAferido.toLocaleString('pt-BR')} kg`
                        : ''}
                    </p>
                    <p className="muted">Registrado por {item.registradoPor}.</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty">Nenhuma coleta encontrada neste período.</p>
            )}
          </>
        )}
        <div className="actions" aria-label="Paginação das doações">
          <button
            type="button"
            className="button secondary"
            disabled={list.loading || page === 1}
            onClick={() => setPage((value) => value - 1)}
          >
            Anterior
          </button>
          <span aria-live="polite">Página {page}</span>
          <button
            type="button"
            className="button secondary"
            disabled={list.loading || !list.data || page * 10 >= list.data.total}
            onClick={() => setPage((value) => value + 1)}
          >
            Próxima
          </button>
        </div>
      </section>
    </div>
  )
}
