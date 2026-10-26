/** Only known internal destinations may be opened from a notification. */
export function notificationDestination(link: string | null, profile?: string): string | null {
  if (!link) return null
  const destinations: Record<string, string> = {
    '/meus-exames': 'external-exams',
    '/locais-recomendados': 'external-locations',
    '/minhas-consultas': 'external-consultations',
    '/exames-para-avaliar': 'professional/exams',
    '/#profile': 'profile',
    '/#professional': 'professional',
    '/#external-consultations': 'external-consultations',
    '/#external-exams': 'external-exams',
    '/#external-locations': 'external-locations',
  }
  let destination = /^\/bancos-de-sangue\/[a-zA-Z0-9-]+$/.test(link) ? 'external-locations' : destinations[link] ?? null
  if (!profile) return destination
  if (destination === 'profile' && profile !== 'PACIENTE') destination = 'professional/profile'
  if (destination?.startsWith('external-') && destination !== 'external-locations' && profile !== 'PACIENTE') return null
  if (destination?.startsWith('professional') && profile === 'PACIENTE') return null
  if (destination === 'professional/exams' && profile !== 'MEDICO') return null
  return destination
}
