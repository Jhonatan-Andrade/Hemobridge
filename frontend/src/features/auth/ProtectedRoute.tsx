import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { PapelEquipe, Perfil } from '../../api/types'
import { Loading } from '../../components/ui'
import { rotaInicial, useAuth } from './authState'

type Props = {
  perfis?: Perfil[]
  /** Na equipe do hemocentro, restringe também pelo papel (RNF03). */
  papeis?: PapelEquipe[]
}

/** Exige sessão e, opcionalmente, um dos perfis ou papéis informados; senão redireciona. */
export function ProtectedRoute({ perfis, papeis }: Props) {
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
  // Contas com senha provisória só acessam a definição de senha.
  if (usuario.senhaProvisoria && location.pathname !== '/primeiro-acesso') return <Navigate to="/primeiro-acesso" replace />
  const semPerfil = perfis && !perfis.includes(usuario.perfil)
  const semPapel = papeis && (!usuario.papel || !papeis.includes(usuario.papel))
  if (semPerfil || semPapel) return <Navigate to={rotaInicial(usuario)} replace />
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
