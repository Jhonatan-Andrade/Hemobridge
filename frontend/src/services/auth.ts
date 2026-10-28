import { api } from '../api/client'
import type { Cadastro, CadastroCriado, Sessao, Termo, TermoConsentimento, UsuarioAutenticado } from '../api/types'

export const authService = {
  login: (email: string, senha: string) => api.post<Sessao>('/auth/login', { email, senha }),
  me: () => api.get<UsuarioAutenticado>('/auth/me'),
  logout: () => api.post<void>('/auth/logout'),
  recuperarSenha: (email: string) => api.post<{ mensagem: string }>('/auth/recuperar-senha', { email }),

  termoPrimeiroAcesso: () => api.get<Termo>('/auth/primeiro-acesso/termo'),
  definirSenhaPrimeiroAcesso: (dados: { novaSenha: string; confirmacaoSenha: string; aceiteTermo: boolean; versaoTermo: string }) =>
    api.post<Sessao>('/auth/primeiro-acesso', dados),

  // RF01 – cadastro do paciente
  termoConsentimento: () => api.get<TermoConsentimento>('/auth/termo-consentimento'),
  cadastrar: (dados: Cadastro) => api.post<CadastroCriado>('/auth/register', dados),
}
