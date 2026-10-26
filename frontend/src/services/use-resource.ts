import { useEffect, useState } from 'react'
import { api, messageOf } from './api-client'
export function useResource<T>(path: string) {
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<{
    path: string
    revision: number
    data?: T
    error?: string
  }>({ path: '', revision: -1 })
  useEffect(() => {
    const controller = new AbortController()
    api<T>(path, { signal: controller.signal })
      .then((data) => setResult({ path, revision, data }))
      .catch((error) => {
        if (!controller.signal.aborted) setResult({ path, revision, error: messageOf(error) })
      })
    return () => controller.abort()
  }, [path, revision])
  return {
    data: result.path === path && result.revision === revision ? result.data : undefined,
    error: result.path === path && result.revision === revision ? result.error : undefined,
    loading: result.path !== path || result.revision !== revision,
    reload: () => setRevision((v) => v + 1),
  }
}
