import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import type { DemoProfile, DemoResponse, PatientStatus } from '../data/fixtures'
import { demoService } from '../services/demoService'
import { ActionButton, Alert, Intro, RouteLink } from '../components/ui'
import type { Navigate } from '../components/ui'
import { FormField } from './Auth'
import { validateForm } from './formModel'

function PatientShell({ children }: { children: ReactNode }) {
  return <main className="content">{children}</main>
}

export function PatientPage({ route, navigate, status, response, profile, onSaveProfile, onCloseAccount, onLogout, fillExample }: { route: string; navigate: Navigate; status: PatientStatus; response: DemoResponse; profile: DemoProfile; onSaveProfile: (value: DemoProfile) => void; onCloseAccount: (trigger: HTMLElement) => void; onLogout: () => void; fillExample: boolean }) {
  const [values, setValues] = useState<DemoProfile>(() => fillExample ? demoService.initialProfile() : { ...profile })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState('')
  const [sending, setSending] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [loadFeedback, setLoadFeedback] = useState('')
  const data = demoService.patientScenario(status)
  const display = demoService.patientDisplay()
  async function retryLoad() {
    if (retrying) return
    setRetrying(true); setLoadFeedback('')
    try { await demoService.retryLoad(response) }
    catch (error) { setLoadFeedback(error instanceof Error ? error.message : 'A leitura continua indisponível.') }
    finally { setRetrying(false) }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending) return
    const nextErrors = validateForm('profile', values, true)
    if (Object.keys(nextErrors).length) { setErrors(nextErrors); setFeedback('Revise os campos indicados antes de continuar.'); document.getElementById(Object.keys(nextErrors)[0])?.focus(); return }
    setSending(true); setFeedback('')
    try { await demoService.submit({ kind: 'profile', fields: { phone: values.phone, weight: values.weight, city: values.city, state: values.state } }, response); onSaveProfile(values); setFeedback('Alterações visíveis enquanto esta sessão estiver aberta. Sua conta não foi modificada.') }
    catch (error) { setFeedback(error instanceof Error ? error.message : 'Falha temporária.') }
    finally { setSending(false) }
  }
  const change = (id: string, value: string) => { setValues((current) => ({ ...current, [id]: value })); setErrors((current) => ({ ...current, [id]: '' })) }
  if (route === 'dashboard') return <PatientShell><Intro title={`Olá, ${display.displayName}`} description="Confira sua situação e o próximo passo." />
    {response === 'loadError' ? <section className="surface state-panel"><Alert tone="error">Não conseguimos carregar o painel.</Alert>{loadFeedback && <Alert tone="error">{loadFeedback}</Alert>}<button className="button" type="button" disabled={retrying} aria-busy={retrying} onClick={retryLoad}>{retrying ? 'Tentando…' : 'Tentar novamente'}</button></section>
      : response === 'loading' ? <section className="surface state-panel" aria-busy="true"><span className="spinner" /><p>Carregando seu painel…</p></section>
        : <><div className="dashboard-grid"><section className="surface card status-card"><span className="badge" data-status={status}>● {data.label}</span><h2 className="status-title">Sua situação</h2><p>{data.summary}</p>{status === 'APROVADO' && <p className="type">Tipo sanguíneo não disponível · somente leitura</p>}</section><section className="surface card next-step"><span className="eyebrow">Próximo passo</span><h2>{data.action}</h2><p className="muted">{data.guidance}</p><RouteLink className="button" to={`external-${data.destination}`} navigate={navigate}>{data.action}</RouteLink></section><section className="surface card full"><h2>Próxima consulta</h2>{status === 'CONSULTA_AGENDADA' ? <div className="consultation"><div className="date-tile">{display.appointment.month}<strong>{display.appointment.day}</strong></div><div><h3>{display.appointment.time} · {display.appointment.unit}</h3><p className="muted">Não há reserva associada a este cartão.</p></div></div> : <p className="empty">Nenhuma consulta futura foi consultada.</p>}</section></div><div className="actions"><RouteLink className="button secondary" to="profile" navigate={navigate}>Meu perfil e privacidade</RouteLink><RouteLink className="button secondary" to="external-P06" navigate={navigate}>Ver notificações</RouteLink></div></>}
  </PatientShell>
  if (route.startsWith('external-')) return <PatientShell><Intro title="Etapa em preparação" description="Este destino ainda não está disponível." /><Alert>Consultas, exames e histórico serão exibidos quando os serviços correspondentes estiverem integrados.</Alert><RouteLink className="button secondary" to="dashboard" navigate={navigate}>Voltar ao painel</RouteLink></PatientShell>
  return <PatientShell><Intro title="Meu perfil e privacidade" description="Revise seus dados e preferências de contato." /><div className="profile-layout"><section className="surface form-panel"><form noValidate onSubmit={save}><h2>Dados pessoais</h2><div className="field-grid">{(['name', 'cpf', 'email', 'birth'] as const).map((id) => <FormField key={id} id={id} value={values[id] ?? ''} onChange={change} readOnly />)}<div className="field"><label htmlFor="sex-readonly">Sexo · somente leitura</label><input id="sex-readonly" readOnly value={values.sex} /></div><div className="field"><label htmlFor="blood-readonly">Tipo sanguíneo · somente leitura</label><input id="blood-readonly" readOnly value={display.bloodType} /></div></div><h2 className="section-title">Dados que você pode atualizar</h2><p className="muted">As alterações não são enviadas ao serviço.</p><div className="field-grid">{(['phone', 'weight', 'city', 'state'] as const).map((id) => <FormField key={id} id={id} value={values[id] ?? ''} onChange={change} error={errors[id]} />)}</div>{feedback && <Alert tone={feedback.startsWith('Alterações visíveis') ? 'success' : 'error'}>{feedback}</Alert>}<div className="actions"><button className="button" type="submit" disabled={sending} aria-busy={sending}>{sending ? 'Aguarde…' : 'Salvar alterações'}</button></div></form><div className="actions"><RouteLink className="button secondary" to="dashboard" navigate={navigate}>Cancelar alterações</RouteLink></div></section><aside className="profile-side"><section className="surface card"><h2>Segurança</h2><p className="muted">Conheça as etapas para alterar sua senha.</p><RouteLink className="button secondary" to="change" navigate={navigate}>Ver alteração de senha</RouteLink></section><section className="surface card danger-card"><h2>Encerramento de conta</h2><p className="muted">Revise as consequências e as confirmações exigidas antes de encerrar uma conta.</p><ActionButton variant="destructive" onClick={(event) => onCloseAccount(event.currentTarget)}>Ver encerramento de conta</ActionButton></section><section className="surface card"><h2>Conta</h2><ActionButton variant="secondary" onClick={onLogout}>Sair</ActionButton></section></aside></div></PatientShell>
}
