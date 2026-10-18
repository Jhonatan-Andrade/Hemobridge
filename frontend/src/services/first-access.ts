const prefix = 'hemobridge.isFirstAccess'
const completedInTab = new Set<string>()

export function readFirstAccess(userId: string): boolean {
  if (completedInTab.has(userId)) return false
  try {
    return window.localStorage.getItem(`${prefix}.${userId}`) !== 'false'
  } catch {
    return true
  }
}

export function completeFirstAccess(userId: string) {
  completedInTab.add(userId)
  try {
    window.localStorage.setItem(`${prefix}.${userId}`, 'false')
  } catch {
    // A conclusão continua válida nesta aba quando o armazenamento está indisponível.
  }
}
