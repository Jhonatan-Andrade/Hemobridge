import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { definirToken, obterToken, registrarExpiracaoSessao } from '../../api/client'
import type { Sessao, UsuarioAutenticado } from '../../api/types'
import { authService } from '../../services/auth'
import { AuthContext, type EstadoAuth } from './authState'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioAutenticado | null>(null)
  const [carregando, setCarregando] = useState(() => obterToken() !== null)

  const encerrar = useCallback(() => {
    definirToken(null)
    setUsuario(null)
  }, [])

  // Restaura a sessão salva ao abrir o app.
  useEffect(() => {
    registrarExpiracaoSessao(encerrar)
    if (!obterToken()) return
    authService
      .me()
      .then(setUsuario)
      .catch(encerrar)
      .finally(() => setCarregando(false))
  }, [encerrar])

  const aplicarSessao = useCallback((sessao: Sessao) => {
    definirToken(sessao.accessToken)
    setUsuario({ ...sessao.usuario, senhaProvisoria: sessao.primeiroAcesso })
  }, [])

  const entrar = useCallback(
    async (email: string, senha: string) => {
      const sessao = await authService.login(email, senha)
      aplicarSessao(sessao)
      return sessao
    },
    [aplicarSessao],
  )

  const sair = useCallback(async () => {
    try {
      await authService.logout()
    } catch {
      // Mesmo se a API falhar, a sessão local é encerrada.
    }
    encerrar()
  }, [encerrar])

  const valor = useMemo<EstadoAuth>(
    () => ({ usuario, carregando, entrar, sair, aplicarSessao }),
    [usuario, carregando, entrar, sair, aplicarSessao],
  )

  return <AuthContext value={valor}>{children}</AuthContext>
}
