import type { SessionUser } from '../types/domain'
import { readFirstAccess } from './first-access.ts'

export function hasPendingJourney(user: SessionUser | null): boolean {
  return !!user && !user.senhaProvisoria && readFirstAccess(user)
}
export function needsJourneyIntroduction(user: SessionUser | null, route: string): boolean {
  if (!hasPendingJourney(user)) return false
  return route === 'dashboard' || route === 'profile' || route === 'notifications' ||
    route.startsWith('professional') || (route.startsWith('external-') && route !== 'external-locations')
}
export function journeyDialogMode(user: SessionUser | null, requestedAccountId: string | null): 'mandatory' | 'review' | null {
  if (!user || user.senhaProvisoria || requestedAccountId !== user.id) return null
  return hasPendingJourney(user) ? 'mandatory' : 'review'
}
