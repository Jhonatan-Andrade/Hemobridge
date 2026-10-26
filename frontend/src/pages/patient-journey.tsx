import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { UserRole } from '../types/domain'
import { api, fileUrl, messageOf } from '../services/api-client'
import { useResource } from '../services/use-resource'
import { Alert, Intro, RouteLink } from '../components/ui'
import type { Navigate } from '../components/ui'
import { PatientPreTriageForm, type PreTriageResult } from '../components/patient-pre-triage-form'
import { notificationDestination } from '../services/notification-destination'
import '../styles/patient-journey.css'
type Slot = {
  disponibilidadeId: string
  inicio: string
  fim: string
  medico: string
  hospital: string
}
type Appointment = {
  id: string
  status: string
  inicio: string
  fim: string
  medico: string
  hospital: string
  linkVideochamada: string | null
  podeCancelarOuReagendar: boolean
}
const when = (date: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(date),
  )
function Failure({ message, retry }: { message: string; retry: () => void }) {
  return (
    <Alert tone="error">
      {message}{' '}
      <button className="text-button" onClick={retry}>
        Tentar novamente
      </button>
    </Alert>
  )
}
function Booking() {
  const [triage, setTriage] = useState<PreTriageResult>()
  return <>
    <Intro title="Agendar consulta" description="Registre a pré-triagem e escolha um horário para sua avaliação." />
    {triage ? <BookingSlots preTriagemId={triage.id} /> : <PatientPreTriageForm onComplete={setTriage} />}
  </>
}
function BookingSlots({ preTriagemId }: { preTriagemId: string }) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus() }, [])
  const slots = useResource<{ itens: Slot[] }>('/paciente/consultas/horarios-disponiveis')
  const [slot, setSlot] = useState(''),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [feedback, setFeedback] = useState('')
  async function book(e: FormEvent) {
    e.preventDefault()
    if (!slot || !consent || busy) return
    setBusy(true)
    try {
      await api('/paciente/agendamentos', {
        method: 'POST',
        body: { disponibilidadeId: slot, aceiteTelemedicina: consent, preTriagemId },
      })
      setFeedback('Consulta agendada. Confira os detalhes em Minhas consultas.')
      setSlot('')
      slots.reload()
    } catch (error) {
      setFeedback(messageOf(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <h2 ref={heading} tabIndex={-1}>Escolha um horário</h2>
      {slots.loading ? (
        <p>Carregando horários…</p>
      ) : slots.error ? (
        <Failure message={slots.error} retry={slots.reload} />
      ) : slots.data?.itens.length ? (
        <form className="surface form-panel" onSubmit={book}>
          <label>
            Horário disponível
            <select value={slot} required onChange={(e) => setSlot(e.target.value)}>
              <option value="">Selecione</option>
              {slots.data.itens.map((s) => (
                <option key={s.disponibilidadeId} value={s.disponibilidadeId}>
                  {when(s.inicio)} · {s.medico} · {s.hospital}
                </option>
              ))}
            </select>
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              required
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            Concordo com o atendimento por telessaúde e com o tratamento dos dados necessários à
            consulta, conforme os termos apresentados.
          </label>
          <a href="#terms">Ler termos do atendimento</a>
          <button className="button" disabled={busy || !consent}>
            {busy ? 'Agendando…' : 'Confirmar agendamento'}
          </button>
        </form>
      ) : (
        <p className="empty">
          Nenhum horário disponível nos próximos 30 dias. Consulte novamente mais tarde.
        </p>
      )}
      {feedback && <p role="status">{feedback}</p>}
    </>
  )
}
function Consultations() {
  const resource = useResource<Appointment[]>('/paciente/consultas'),
    slots = useResource<{ itens: Slot[] }>('/paciente/consultas/horarios-disponiveis')
  const [feedback, setFeedback] = useState(''),
    [selected, setSelected] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState('')
  async function action(id: string, type: 'cancelar' | 'reagendar') {
    if (busy) return
    setBusy(id)
    try {
      await api(`/paciente/consultas/${id}/${type}`, {
        method: 'POST',
        body:
          type === 'cancelar'
            ? { motivo: 'Cancelada pelo paciente' }
            : { disponibilidadeId: selected[id] },
      })
      setFeedback(type === 'cancelar' ? 'Consulta cancelada.' : 'Consulta reagendada.')
      resource.reload()
      slots.reload()
    } catch (error) {
      setFeedback(messageOf(error))
    } finally {
      setBusy('')
    }
  }
  return (
    <>
      <Intro
        title="Minhas consultas"
        description="Confira seus horários e as orientações de atendimento."
      />
      {resource.loading ? (
        <p>Carregando consultas…</p>
      ) : resource.error ? (
        <Failure message={resource.error} retry={resource.reload} />
      ) : resource.data?.length ? (
        resource.data.map((c) => (
          <article className="surface card" key={c.id}>
            <h2>{when(c.inicio)}</h2>
            <p>
              {c.medico} · {c.hospital}
            </p>
            <p>{c.status.replaceAll('_', ' ')}</p>
            {c.linkVideochamada && (
              <a
                className="button"
                href={c.linkVideochamada}
                rel="noopener noreferrer"
                target="_blank"
              >
                Abrir consulta ↗
              </a>
            )}
            {c.podeCancelarOuReagendar && (
              <details>
                <summary>Alterar consulta</summary>
                <p>Cancelamento e reagendamento exigem pelo menos 24 horas de antecedência.</p>
                <label>
                  Novo horário
                  <select
                    value={selected[c.id] ?? ''}
                    onChange={(e) => setSelected((v) => ({ ...v, [c.id]: e.target.value }))}
                  >
                    <option value="">Selecione</option>
                    {slots.data?.itens.map((s) => (
                      <option key={s.disponibilidadeId} value={s.disponibilidadeId}>
                        {when(s.inicio)} · {s.medico}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="actions">
                  <button
                    className="button secondary"
                    disabled={!!busy || !selected[c.id]}
                    onClick={() => void action(c.id, 'reagendar')}
                  >
                    Confirmar reagendamento
                  </button>
                  <button
                    className="button destructive"
                    disabled={!!busy}
                    onClick={() => void action(c.id, 'cancelar')}
                  >
                    Confirmar cancelamento
                  </button>
                </div>
              </details>
            )}
          </article>
        ))
      ) : (
        <p className="empty">Nenhuma consulta registrada.</p>
      )}
      {feedback && <p role="status">{feedback}</p>}
    </>
  )
}
type Exam = {
  id: string
  exames: string[]
  orientacoes: string | null
  medico: string
  situacao: string
  motivoReprovacao: string | null
  podeEnviar: boolean
  envios: { id: string; nomeOriginal: string; situacao: string }[]
}
function Exams() {
  const resource = useResource<{ itens: Exam[] }>('/paciente/exames')
  const [feedback, setFeedback] = useState(''),
    [busy, setBusy] = useState('')
  async function upload(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault()
    const input = e.currentTarget.elements.namedItem('arquivo') as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setFeedback('O arquivo deve ter até 5 MB.')
      return
    }
    const body = new FormData()
    body.append('arquivo', file)
    setBusy(id)
    try {
      await api(`/paciente/exames/${id}/envios`, { method: 'POST', body })
      setFeedback('Arquivo enviado para análise.')
      resource.reload()
    } catch (error) {
      setFeedback(messageOf(error))
    } finally {
      setBusy('')
    }
  }
  return (
    <>
      <Intro
        title="Meus exames"
        description="Veja as solicitações da equipe e acompanhe a análise dos resultados."
      />
      {resource.loading ? (
        <p>Carregando exames…</p>
      ) : resource.error ? (
        <Failure message={resource.error} retry={resource.reload} />
      ) : resource.data?.itens.length ? (
        resource.data.itens.map((exam) => (
          <article className="surface card" key={exam.id}>
            <h2>{exam.exames.join(', ')}</h2>
            <p>
              {exam.medico} · {exam.situacao.replaceAll('_', ' ')}
            </p>
            <p>{exam.orientacoes}</p>
            {exam.motivoReprovacao && <Alert tone="warning">{exam.motivoReprovacao}</Alert>}
            <ul>
              {exam.envios.map((file) => (
                <li key={file.id}>
                  <a
                    href={fileUrl(`/paciente/exames/envios/${file.id}/arquivo`)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {file.nomeOriginal} ↗
                  </a>{' '}
                  · {file.situacao}
                </li>
              ))}
            </ul>
            {exam.podeEnviar && (
              <form onSubmit={(e) => void upload(e, exam.id)}>
                <label>
                  Resultado do exame
                  <input
                    type="file"
                    name="arquivo"
                    accept="application/pdf,image/jpeg,image/png"
                    required
                  />
                </label>
                <p className="help">
                  PDF, JPG ou PNG, até 5 MB. Envie apenas o arquivo solicitado.
                </p>
                <button className="button" disabled={!!busy}>
                  {busy === exam.id ? 'Enviando…' : 'Enviar resultado'}
                </button>
              </form>
            )}
          </article>
        ))
      ) : (
        <p className="empty">Nenhum exame solicitado.</p>
      )}
      {feedback && <p role="status">{feedback}</p>}
    </>
  )
}
export function Notifications({ navigate, profile = 'PACIENTE' }: { navigate: Navigate; profile?: UserRole }) {
  const [page, setPage] = useState(1),
    resource = useResource<{
      itens: { id: string; titulo: string; mensagem: string; link: string | null; lida: boolean; enviadaEm: string }[]
      total: number
      naoLidas: number
    }>(`/notificacoes?pagina=${page}&tamanhoPagina=20`)
  const [feedback, setFeedback] = useState('')
  const [busy, setBusy] = useState(false)
  async function read(id: string, destination?: string | null) {
    if (busy) return
    setBusy(true)
    try {
      await api(`/notificacoes/${id}`)
      resource.reload()
      if (destination) navigate(destination)
    } catch (error) {
      setFeedback(messageOf(error))
    } finally { setBusy(false) }
  }
  async function readAll() {
    if (busy) return
    setBusy(true)
    try {
      await api('/notificacoes/marcar-todas-lidas', { method: 'POST' })
      resource.reload()
      setFeedback('Todas as notificações foram marcadas como lidas.')
    } catch (error) { setFeedback(messageOf(error)) }
    finally { setBusy(false) }
  }
  return (
    <>
      <Intro title="Notificações" description="Acompanhe os avisos enviados à sua conta." />
      {resource.loading ? (
        <p>Carregando avisos…</p>
      ) : resource.error ? (
        <Failure message={resource.error} retry={resource.reload} />
      ) : (
        <>
          <p>{resource.data?.naoLidas ?? 0} não lidas</p>
          <button className="button secondary" disabled={busy || !resource.data?.naoLidas} onClick={() => void readAll()}>Marcar todas como lidas</button>
          {resource.data?.itens.map((n) => (
            <article className="surface card" key={n.id}>
              <h2>{n.titulo}</h2>
              <time dateTime={n.enviadaEm}>{when(n.enviadaEm)}</time>
              <p>{n.mensagem}</p>
              {notificationDestination(n.link, profile) && <button className="button secondary" disabled={busy} onClick={() => void read(n.id, notificationDestination(n.link, profile))}>Ver detalhes</button>}
              {!n.lida && (
                <button className="text-button" disabled={busy} onClick={() => void read(n.id)}>
                  Marcar como lida
                </button>
              )}
            </article>
          ))}
          {!resource.data?.itens.length && <p>Nenhuma notificação.</p>}
          <div className="actions">
            <button
              className="button secondary"
              disabled={page === 1}
              onClick={() => setPage((v) => v - 1)}
            >
              Anterior
            </button>
            <button
              className="button secondary"
              disabled={page * 20 >= (resource.data?.total ?? 0)}
              onClick={() => setPage((v) => v + 1)}
            >
              Próxima
            </button>
          </div>
        </>
      )}
      {feedback && <p role="status">{feedback}</p>}
    </>
  )
}
function PreTriage() {
  const resource = useResource<{
    elegivel: boolean
    mensagem?: string
    proximaData?: string
    exigeAutorizacaoResponsavel: boolean
  }>('/paciente/orientacoes-doacao')
  return (
    <>
      <Intro
        title="Antes de doar"
        description="Orientação com base nos dados e doações registrados na plataforma."
      />
      {resource.error ? (
        <Failure message={resource.error} retry={resource.reload} />
      ) : resource.loading ? (
        <p>Carregando orientações…</p>
      ) : (
        <section className="surface card">
          <h2>
            {resource.data?.elegivel ? 'Critérios básicos consultados' : 'Confira a orientação'}
          </h2>
          <p>
            {resource.data?.mensagem ??
              'Os dados registrados não apontam impedimento pelos critérios básicos consultados.'}
          </p>
          {resource.data?.proximaData && (
            <p>Próxima data orientativa: {resource.data.proximaData}</p>
          )}
          {resource.data?.exigeAutorizacaoResponsavel && (
            <p>
              Menores de 18 anos precisam da autorização do responsável conforme o serviço de
              hemoterapia.
            </p>
          )}
          <Alert>
            A triagem presencial do hemocentro define a possibilidade de doar. Esta orientação não é
            aprovação clínica.
          </Alert>
        </section>
      )}
    </>
  )
}
export function PatientJourneyPage({ route, navigate }: { route: string; navigate: Navigate }) {
  return (
    <main className="patient-workspace content">
      <RouteLink className="back-link" to="dashboard" navigate={navigate}>
        ← Meu painel
      </RouteLink>
      {route === 'external-booking' ? (
        <Booking />
      ) : route === 'external-consultations' ? (
        <Consultations />
      ) : route === 'external-exams' ? (
        <Exams />
      ) : route === 'external-notifications' ? (
        <Notifications navigate={navigate} />
      ) : (
        <PreTriage />
      )}
    </main>
  )
}
