import type { Publication } from '../types/domain'

export function expirePinnedPublications(items: Publication[], now: number): Publication[] {
  return items
    .map((post) => post.pinned && !(Date.parse(post.pinnedUntil ?? '') > now)
      ? { ...post, pinned: false }
      : post)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
}

export function nextPinExpiryDelay(items: Publication[], now: number): number | null {
  const deadlines = items.filter((post) => post.pinned).map((post) => {
    const deadline = Date.parse(post.pinnedUntil ?? '')
    return Number.isFinite(deadline) ? deadline : now
  })
  if (!deadlines.length) return null
  return Math.max(0, Math.min(2_147_483_647, Math.min(...deadlines) - now + 10))
}
