import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { Perfil } from '../../api/types'
import { Loading } from '../../components/ui'
import { rotaInicial, useAuth } from './authState'

/** Exige sessão e, opcionalmente, um dos perfis informados; senão redireciona. */
export function ProtectedRoute({ perfis }: { perfis?: Perfil[] }) {
  const { usuario, carregando } = useAuth()
  const location = useLocation()

  if (carregando) {
    return (
      <div className="mx-auto max-w-form p-12">
        <Loading texto="Verificando sua sessão…" />
      </div>
    )
  }
  if (!usuario) return <Navigate to="/entrar" replace state={{ de: location.pathname }} />
  // Profissionais com senha provisória só acessam a definição de senha (UC07).
  if (usuario.senhaProvisoria && location.pathname !== '/primeiro-acesso') return <Navigate to="/primeiro-acesso" replace />
  if (perfis && !perfis.includes(usuario.perfil)) return <Navigate to={rotaInicial(usuario)} replace />
  return <Outlet />
}

/**
 * Telas públicas de acesso: quem já está logado vai direto para a sua área ou,
 * logo depois do login, para a página de onde veio (`state.de`).
 */
export function PublicOnlyRoute() {
  const { usuario, carregando } = useAuth()
  const destino = (useLocation().state as { de?: string } | null)?.de
  if (carregando) return null
  if (usuario) return <Navigate to={destino && !usuario.senhaProvisoria ? destino : rotaInicial(usuario)} replace />
  return <Outlet />
}
