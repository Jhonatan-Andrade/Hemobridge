import { api } from '../api/client'
import type { PreCadastro, PreCadastroCriado, Sessao, Termo, UsuarioAutenticado } from '../api/types'

export const authService = {
  login: (email: string, senha: string) => api.post<Sessao>('/auth/login', { email, senha }),
  me: () => api.get<UsuarioAutenticado>('/auth/me'),
  logout: () => api.post<void>('/auth/logout'),
  recuperarSenha: (email: string) => api.post<{ mensagem: string }>('/auth/recuperar-senha', { email }),

  termoPrimeiroAcesso: () => api.get<Termo>('/auth/primeiro-acesso/termo'),
  definirSenhaPrimeiroAcesso: (dados: { novaSenha: string; confirmacaoSenha: string; aceiteTermo: boolean; versaoTermo: string }) =>
    api.post<Sessao>('/auth/primeiro-acesso', dados),

  termoConsentimento: () => api.get<Termo>('/pacientes/termo-consentimento'),
  preCadastrar: (dados: PreCadastro) => api.post<PreCadastroCriado>('/pacientes', dados),
}
