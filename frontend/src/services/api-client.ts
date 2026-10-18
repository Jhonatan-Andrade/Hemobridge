const base = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '')
export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}
type Options = Omit<RequestInit, 'body'> & { body?: unknown }
export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const { body, ...request } = options
  const form = body instanceof FormData
  let response: Response
  try {
    response = await fetch(`${base}${path}`, {
      ...request,
      credentials: 'include',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        ...(!form && body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...request.headers,
      },
      body: body === undefined ? undefined : form ? body : JSON.stringify(body),
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(
      'Não foi possível conectar ao serviço. Verifique sua conexão e tente novamente.',
      0,
    )
  }
  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as {
      message?: string | string[]
    } | null
    const message = result?.message
    throw new ApiError(
      Array.isArray(message)
        ? message.join(' ')
        : (message ?? 'Não foi possível concluir a solicitação.'),
      response.status,
    )
  }
  return response.status === 204 ? (undefined as T) : (response.json() as Promise<T>)
}
export const fileUrl = (path: string) => `${base}${path}`
export const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : 'Não foi possível concluir. Tente novamente.'
