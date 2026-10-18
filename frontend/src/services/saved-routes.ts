// Preserva os endereços já compartilhados sem expor os identificadores nas telas.
const aliases: Record<string, string> = {
  'redefinir-senha': 'reset',
  'external-P03': 'external-pre-triage',
  'external-P04': 'external-consultations',
  'external-P05': 'external-exams',
  'external-P06': 'external-notifications',
  'external-P08': 'external-locations',
}
export const savedRoute = (route: string) => aliases[route] ?? route
