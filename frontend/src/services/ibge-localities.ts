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
const cache = new Map<string, State[] | Municipality[]>()
async function load<T extends State[] | Municipality[]>(
  path: string,
  signal: AbortSignal,
): Promise<T> {
  const cached = cache.get(path)
  if (cached) return cached as T
  const timeout = AbortSignal.timeout(15000)
  const response = await fetch(`${base}${path}`, {
    signal: AbortSignal.any([signal, timeout]),
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
  })
  if (!response.ok) throw new Error('Não foi possível carregar as localidades do IBGE.')
  const data: unknown = await response.json()
  if (
    !Array.isArray(data) ||
    !data.every((item) => typeof item.id === 'number' && typeof item.nome === 'string')
  )
    throw new Error('O IBGE retornou um formato de localidades inválido.')
  cache.set(path, data)
  return data as T
}
export const loadStates = (signal: AbortSignal) => load<State[]>('/estados?orderBy=nome', signal)
export const loadMunicipalities = (uf: string, signal: AbortSignal) => {
  if (!/^[A-Z]{2}$/.test(uf)) throw new Error('Estado inválido.')
  return load<Municipality[]>(`/estados/${uf}/municipios?orderBy=nome`, signal)
}
