import type { SessionUser } from '../types/domain'
import { communityRoleLabels, professionalRoleOf } from '../types/domain'
import { useResource } from '../services/use-resource'
import { Alert, Intro, RouteLink } from '../components/ui'
import type { Navigate } from '../components/ui'

export function ProfessionalProfilePage({ navigate }: { navigate: Navigate }) {
  const profile = useResource<SessionUser>('/auth/me')
  return <main className="patient-workspace content">
    <Intro title="Meu perfil" description="Confira a identificação e as opções de segurança da sua conta." />
    {profile.loading ? <p>Carregando sua conta…</p> : profile.error ? <Alert tone="error">{profile.error} <button onClick={profile.reload}>Tentar novamente</button></Alert> : profile.data && <section className="surface card">
      <h2>{profile.data.nome}</h2>
      <p>{profile.data.email}</p>
      <p>{communityRoleLabels[professionalRoleOf(profile.data)]}</p>
      <p>Suas permissões acompanham os vínculos e as autorizações cadastrados. Utilize uma conta individual e preserve o sigilo das informações acessadas.</p>
      <div className="actions">
        <RouteLink className="button secondary" to="change" navigate={navigate}>Alterar senha</RouteLink>
        <RouteLink to="privacy" navigate={navigate}>Privacidade e direitos</RouteLink>
        <RouteLink to="terms" navigate={navigate}>Termos de uso</RouteLink>
      </div>
    </section>}
  </main>
}
