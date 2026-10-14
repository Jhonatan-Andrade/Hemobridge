export interface BackendHealth { message: string }

// Only GET /app exists on the inspected NestJS branch. The Vite proxy maps
// /api/app to it during local development; this proves reachability only.
export async function checkBackendHealth(signal?: AbortSignal): Promise<BackendHealth> {
  const response = await fetch('/api/app', { signal })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const data: unknown = await response.json()
  if (typeof data !== 'object' || data === null || !('message' in data) || data.message !== 'App is running') {
    throw new Error('Resposta inesperada de GET /app')
  }
  return { message: data.message }
}
