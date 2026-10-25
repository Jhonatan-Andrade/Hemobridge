const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3333').replace(/\/$/, '')
const CHAVE_TOKEN = 'hemobridge.token'

/** Erro devolvido pela API no formato padrão do NestJS. */
export class ApiError extends Error {
  readonly status: number
  readonly mensagens: string[]

  constructor(status: number, mensagens: string[]) {
    super(mensagens.join(' '))
    this.status = status
    this.mensagens = mensagens
  }
}

let aoExpirarSessao: (() => void) | null = null

export function registrarExpiracaoSessao(callback: () => void) {
  aoExpirarSessao = callback
}

export function obterToken(): string | null {
  try {
    return localStorage.getItem(CHAVE_TOKEN)
  } catch {
    return null
  }
}

export function definirToken(token: string | null) {
  try {
    if (token) localStorage.setItem(CHAVE_TOKEN, token)
    else localStorage.removeItem(CHAVE_TOKEN)
  } catch {
    // Armazenamento indisponível (modo privado): a sessão dura só esta aba.
  }
}

type Query = Record<string, string | number | boolean | undefined | null>

function montarUrl(caminho: string, query?: Query) {
  const url = new URL(API_URL + caminho)
  for (const [chave, valor] of Object.entries(query ?? {})) {
    if (valor !== undefined && valor !== null && valor !== '') url.searchParams.set(chave, String(valor))
  }
  return url
}

async function enviar(metodo: string, caminho: string, corpo?: unknown, query?: Query): Promise<Response> {
  const token = obterToken()
  let resposta: Response
  try {
    resposta = await fetch(montarUrl(caminho, query), {
      method: metodo,
      // FormData (arquivos) define o próprio Content-Type com o boundary do multipart.
      headers: {
        ...(corpo !== undefined && !(corpo instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: corpo instanceof FormData ? corpo : corpo !== undefined ? JSON.stringify(corpo) : undefined,
    })
  } catch {
    throw new ApiError(0, ['Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'])
  }

  if (!resposta.ok) {
    const dados = await resposta.json().catch(() => null)
    // Token expirado ou sessão encerrada em outro lugar (logout, desativação).
    if (resposta.status === 401 && token) aoExpirarSessao?.()
    const mensagem = dados?.message ?? resposta.statusText
    throw new ApiError(resposta.status, Array.isArray(mensagem) ? mensagem : [String(mensagem)])
  }
  return resposta
}

async function requisicao<T>(metodo: string, caminho: string, corpo?: unknown, query?: Query): Promise<T> {
  const resposta = await enviar(metodo, caminho, corpo, query)
  if (resposta.status === 204) return undefined as T
  return (await resposta.json().catch(() => null)) as T
}

export const api = {
  get: <T>(caminho: string, query?: Query) => requisicao<T>('GET', caminho, undefined, query),
  post: <T>(caminho: string, corpo?: unknown) => requisicao<T>('POST', caminho, corpo ?? {}),
  put: <T>(caminho: string, corpo: unknown) => requisicao<T>('PUT', caminho, corpo),
  patch: <T>(caminho: string, corpo: unknown) => requisicao<T>('PATCH', caminho, corpo),
  delete: <T>(caminho: string) => requisicao<T>('DELETE', caminho),
  /** Arquivo protegido (ex.: resultado de exame), baixado com o token da sessão. */
  arquivo: async (caminho: string) => (await enviar('GET', caminho)).blob(),
}

export function mensagemDeErro(erro: unknown): string[] {
  if (erro instanceof ApiError) return erro.mensagens
  return ['Ocorreu um erro inesperado. Tente novamente.']
}
