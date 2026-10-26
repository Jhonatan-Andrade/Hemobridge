import type { Publication } from '../types/domain'

type Author = Pick<Publication, 'role' | 'verified'>
type Pin = Author & Pick<Publication, 'pinned' | 'pinnedUntil'>

export function isVerifiedAuthor(post: Author): boolean {
  return (
    post.verified === true &&
    (post.role === 'doctor' || post.role === 'representative' || post.role === 'institution')
  )
}

export function isInstitutionalPin(post: Pin): boolean {
  return (
    post.pinned === true &&
    isVerifiedAuthor(post) &&
    (post.role === 'representative' || post.role === 'institution') &&
    Number.isFinite(Date.parse(post.pinnedUntil ?? ''))
  )
}

function createdAt(post: Publication): number {
  const timestamp = Date.parse(post.date)
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY
}

export function expirePinnedPublications(items: Publication[], now: number): Publication[] {
  return items
    .map((post) =>
      post.pinned && !(isInstitutionalPin(post) && Date.parse(post.pinnedUntil!) > now)
        ? { ...post, pinned: false }
        : post,
    )
    .sort((a, b) => {
      const priority = Number(b.pinned) - Number(a.pinned)
      if (priority) return priority
      const aTime = createdAt(a),
        bTime = createdAt(b)
      if (aTime !== bTime) return aTime > bTime ? -1 : 1
      return b.id.localeCompare(a.id)
    })
}

export function mergePublications(
  current: Publication[],
  incoming: Publication[],
  now: number,
): Publication[] {
  const byId = new Map(current.map((post) => [post.id, post]))
  // A paginação preserva as reações e os comentários que já estão carregados.
  for (const post of incoming) if (!byId.has(post.id)) byId.set(post.id, post)
  return expirePinnedPublications([...byId.values()], now)
}

export function nextPinExpiryDelay(items: Publication[], now: number): number | null {
  const deadlines = items
    .filter((post) => post.pinned)
    .map((post) => {
      const deadline = Date.parse(post.pinnedUntil ?? '')
      return isInstitutionalPin(post) ? deadline : now
    })
  if (!deadlines.length) return null
  return Math.max(0, Math.min(2_147_483_647, Math.min(...deadlines) - now + 10))
}
