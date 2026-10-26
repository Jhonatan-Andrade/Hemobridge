import { useState } from 'react'
import type { FormEvent } from 'react'
import type { SessionUser, UserProfile } from '../types/domain'
import { statusLabels } from '../types/domain'
import { api, messageOf } from '../services/api-client'
import { useResource } from '../services/use-resource'
import { LocationSelects } from '../components/location-selects'
import { Alert, Intro, RouteLink } from '../components/ui'
import type { Navigate } from '../components/ui'
import { FormField } from './auth'
export function PatientPage({
  route,
  user,
  navigate,
  onLogout,
}: {
  route: string
  user: SessionUser
  navigate: Navigate
  onLogout: () => void
}) {
  const profile = useResource<UserProfile>('/paciente/perfil')
  return (
    <main className="content patient-workspace">
      <Intro
        title={
          route === 'dashboard' ? `Olá, ${user.nome.split(' ')[0]}` : 'Meu perfil e privacidade'
        }
        description={
          route === 'dashboard'
            ? 'Confira sua situação e o próximo passo.'
            : 'Revise seus dados e as preferências da conta.'
        }
      />
      {profile.loading ? (
        <p aria-busy="true">Carregando seus dados…</p>
      ) : profile.error ? (
        <Alert tone="error">
          {profile.error} <button onClick={profile.reload}>Tentar novamente</button>
        </Alert>
      ) : (
        profile.data &&
        (route === 'profile' ? (
          <ProfileForm
            key={JSON.stringify(profile.data)}
            initial={profile.data}
            navigate={navigate}
            onSaved={profile.reload}
            onLogout={onLogout}
          />
        ) : (
          <>
            <div className="dashboard-grid">
              <section className="surface card status-card">
                <span className="badge">{statusLabels[profile.data.status]}</span>
                <h2>Sua situação</h2>
                <p>Acompanhe as orientações da equipe em cada etapa.</p>
                {profile.data.bloodType && (
                  <p>
                    Tipo sanguíneo validado: <strong>{profile.data.bloodType}</strong>
                  </p>
                )}
              </section>
              <section className="surface card next-step">
                <span className="eyebrow">Próximo passo</span>
                <h2>
                  {profile.data.status === 'APROVADO'
                    ? 'Encontrar onde doar'
                    : ['PRE_CADASTRADO', 'REPROVADO'].includes(profile.data.status)
                    ? 'Agendar consulta'
                    : profile.data.status === 'AGUARDANDO_EXAME'
                      ? 'Enviar exame'
                      : 'Acompanhar atendimento'}
                </h2>
                <p>{profile.data.status === 'APROVADO' ? 'Veja instituições com necessidades compatíveis com seu tipo sanguíneo e as orientações para doar.' : 'Consulte os horários, solicitações e orientações disponíveis para você.'}</p>
                <RouteLink
                  className="button"
                  to={
                    profile.data.status === 'APROVADO'
                      ? 'external-locations'
                      : ['PRE_CADASTRADO', 'REPROVADO'].includes(profile.data.status)
                      ? 'external-booking'
                      : profile.data.status === 'AGUARDANDO_EXAME'
                        ? 'external-exams'
                        : 'external-consultations'
                  }
                  navigate={navigate}
                >
                  Continuar jornada
                </RouteLink>
              </section>
            </div>
            <div className="workspace-links">
              {[
                ['external-consultations', 'Minhas consultas'],
                ['external-exams', 'Meus exames'],
                ['external-notifications', 'Notificações'],
                ['external-locations', 'Encontrar locais'],
                ['external-pre-triage', 'Orientações antes de doar'],
                ['community', 'Comunidade'],
              ].map(([to, label]) => (
                <RouteLink key={to} to={to} navigate={navigate} className="surface workspace-link">
                  {label} →
                </RouteLink>
              ))}
            </div>
          </>
        ))
      )}
    </main>
  )
}
function ProfileForm({
  initial,
  navigate,
  onSaved,
  onLogout,
}: {
  initial: UserProfile
  navigate: Navigate
  onSaved: () => void
  onLogout: () => void
}) {
  const [values, setValues] = useState(initial),
    [busy, setBusy] = useState(false),
    [feedback, setFeedback] = useState(''),
    [password, setPassword] = useState('')
  async function save(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      await api('/paciente/perfil', {
        method: 'PATCH',
        body: {
          telefone: values.phone,
          pesoKg: Number(values.weight),
          cidade: values.city,
          estado: values.state,
        },
      })
      setFeedback('Alterações salvas.')
      onSaved()
    } catch (error) {
      setFeedback(messageOf(error))
    } finally {
      setBusy(false)
    }
  }
  async function close(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      await api('/conta/solicitacoes-exclusao', { method: 'POST', body: { senhaAtual: password } })
      setPassword('')
      setFeedback(
        'Solicitação de encerramento recebida. A exclusão segue as obrigações de guarda e a análise do canal de privacidade.',
      )
    } catch (error) {
      setFeedback(messageOf(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="profile-layout">
      <section className="surface form-panel">
        <h2>Dados pessoais</h2>
        <p>
          {initial.name} · {initial.email}
        </p>
        <p>CPF: ***.***.***-{initial.cpf.slice(-2)}</p>
        <p>Tipo sanguíneo: {initial.bloodType ?? 'Aguardando validação profissional'}</p>
        <form onSubmit={save}>
          <h2>Dados de contato e acompanhamento</h2>
          <div className="field-grid">
            {(['phone', 'weight'] as const).map((id) => (
              <FormField
                key={id}
                id={id}
                value={values[id]}
                onChange={(key, value) => setValues((v) => ({ ...v, [key]: value }))}
              />
            ))}
          </div>
          <LocationSelects
            state={values.state}
            city={values.city}
            required
            onChange={(state, city) => setValues((v) => ({ ...v, state, city }))}
          />
          <button className="button" disabled={busy}>
            Salvar alterações
          </button>
        </form>
      </section>
      <aside className="profile-side">
        <section className="surface card">
          <h2>Segurança</h2>
          <RouteLink className="button secondary" to="change" navigate={navigate}>
            Alterar senha
          </RouteLink>
          <button className="button secondary" onClick={onLogout}>
            Sair
          </button>
        </section>
        <section className="surface card danger-card">
          <h2>Encerramento da conta</h2>
          <p>
            A solicitação é registrada para atendimento. Dados sujeitos a obrigação legal de guarda
            seguem os prazos aplicáveis.
          </p>
          <form onSubmit={close}>
            <label>
              Senha atual
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            <button className="button destructive" disabled={busy}>
              Solicitar encerramento
            </button>
          </form>
        </section>
      </aside>
      {feedback && <p role="status">{feedback}</p>}
    </div>
  )
}
