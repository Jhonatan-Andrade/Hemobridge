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

export function routeFromLocation(location: { hash: string; pathname: string }) {
  try {
    const route =
      location.hash.slice(1).split('?')[0] ||
      (location.pathname.replace(/^\/+|\/+$/g, '') === 'redefinir-senha' ? 'reset' : 'home')
    return savedRoute(decodeURIComponent(route))
  } catch {
    return 'home'
  }
}

export type PostContext = { origin: 'home' | 'community'; scroll: number; postId: string }
export function postContext(value: unknown): PostContext | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<PostContext>
  return (candidate.origin === 'home' || candidate.origin === 'community') &&
    typeof candidate.scroll === 'number' &&
    Number.isFinite(candidate.scroll) &&
    candidate.scroll >= 0 &&
    typeof candidate.postId === 'string' &&
    /^[\da-f-]{36}$/i.test(candidate.postId)
    ? (candidate as PostContext)
    : null
}
