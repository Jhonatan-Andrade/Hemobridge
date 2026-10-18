export interface State {
  id: number
  sigla: string
  nome: string
}
export interface Municipality {
  id: number
  nome: string
}
const base = 'https://servicodados.ibge.gov.br/api/v1/localidades'
const cache = new Map<string, Municipality[]>()

function isMunicipality(item: unknown): item is Municipality {
  if (typeof item !== 'object' || item === null) return false
  return (
    'id' in item &&
    Number.isInteger(item.id) &&
    'nome' in item &&
    typeof item.nome === 'string' &&
    item.nome.trim().length > 0
  )
}

function isState(item: unknown): item is State {
  return (
    isMunicipality(item) &&
    'sigla' in item &&
    typeof item.sigla === 'string' &&
    /^[A-Z]{2}$/.test(item.sigla)
  )
}

async function load<T extends Municipality>(
  path: string,
  signal: AbortSignal,
  validate: (item: unknown) => item is T,
): Promise<T[]> {
  signal.throwIfAborted()
  const cached = cache.get(path)
  if (cached) return cached as T[]
  const timeout = AbortSignal.timeout(15000)
  const response = await fetch(`${base}${path}`, {
    signal: AbortSignal.any([signal, timeout]),
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
  })
  if (!response.ok) throw new Error('Não foi possível carregar as localidades do IBGE.')
  const data: unknown = await response.json()
  signal.throwIfAborted()
  if (!Array.isArray(data) || !data.every(validate))
    throw new Error('O IBGE retornou um formato de localidades inválido.')
  cache.set(path, data)
  return data
}
export const loadStates = (signal: AbortSignal) => load('/estados?orderBy=nome', signal, isState)
export const loadMunicipalities = async (uf: string, signal: AbortSignal) => {
  if (!/^[A-Z]{2}$/.test(uf)) throw new Error('Estado inválido.')
  return load(`/estados/${uf}/municipios?orderBy=nome`, signal, isMunicipality)
}
