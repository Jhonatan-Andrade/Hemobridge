import { ApiError, api } from './api-client.ts'

export async function endSession(): Promise<void> {
  try {
    await api('/auth/logout', { method: 'POST' })
  } catch (error) {
    // Uma sessão já expirada também deve permitir sair da área privada.
    if (!(error instanceof ApiError && error.status === 401)) throw error
  }
}
