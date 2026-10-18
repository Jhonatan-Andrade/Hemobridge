import { api } from './api-client.ts'

type TourAccount = { isFirstAccess?: boolean; tourVersion?: number }
export function readFirstAccess(account: TourAccount): boolean {
  return account.isFirstAccess !== false
}

export async function completeFirstAccess(account: TourAccount) {
  const result = await api<{ isFirstAccess: boolean; tourVersion: number }>(
    '/auth/tour/conclusao',
    {
      method: 'POST',
      body: { versao: account.tourVersion },
    },
  )
  if (result.isFirstAccess !== false)
    throw new Error('Não foi possível confirmar a conclusão. Tente novamente.')
  return result
}
