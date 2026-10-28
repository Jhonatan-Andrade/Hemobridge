import { createContext, useContext } from 'react'
import type { Sessao, UsuarioAutenticado } from '../../api/types'

export interface EstadoAuth {
  usuario: UsuarioAutenticado | null
  /** true enquanto a sessão salva é validada em /auth/me. */
  carregando: boolean
  entrar: (email: string, senha: string) => Promise<Sessao>
  sair: () => Promise<void>
  aplicarSessao: (sessao: Sessao) => void
}

export const AuthContext = createContext<EstadoAuth | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}

/** Área inicial de cada perfil (e papel, na equipe do hemocentro) após o login. */
export function rotaInicial(usuario: Pick<UsuarioAutenticado, 'perfil' | 'papel' | 'senhaProvisoria'>): string {
  if (usuario.senhaProvisoria) return '/primeiro-acesso'
  if (usuario.perfil === 'PACIENTE') return '/painel'
  if (usuario.perfil === 'ADMIN_PLATAFORMA') return '/admin'
  return usuario.papel === 'MEDICO' ? '/medico' : '/hemocentro'
}
