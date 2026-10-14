export type FontScale = 100 | 125 | 150 | 200

const FONT_KEY = 'hemobridge.demo.fontScale'
const LIBRAS_KEY = 'hemobridge.demo.vlibrasAuto'
const TOUR_KEY = 'hemobridge.demo.tourSeen'
const scales: FontScale[] = [100, 125, 150, 200]

function read(key: string) {
  try { return window.localStorage.getItem(key) } catch { return null }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, value)
  } catch { /* Preferences still work for this tab when storage is unavailable. */ }
}

export function readFontScale(): FontScale {
  const value = Number(read(FONT_KEY))
  return scales.includes(value as FontScale) ? value as FontScale : 100
}

export function saveFontScale(value: FontScale) { write(FONT_KEY, String(value)) }
export function readVlibrasAuto() { return read(LIBRAS_KEY) === 'true' }
export function saveVlibrasAuto(value: boolean) { write(LIBRAS_KEY, value ? 'true' : null) }
export function hasSeenTour(audience: string) { return read(`${TOUR_KEY}.${audience}`) === 'true' }
export function markTourSeen(audience: string) { write(`${TOUR_KEY}.${audience}`, 'true') }

const SCRIPT_ID = 'hemobridge-vlibras-plugin'
const SCRIPT_URL = 'https://vlibras.gov.br/app/vlibras-plugin.js'
let loading: Promise<void> | null = null

/** Official VLibras widget; it initializes itself after its script loads. */
export function loadVlibras(): Promise<void> {
  if (loading) return loading
  if (document.getElementById(SCRIPT_ID)) return Promise.resolve()
  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = SCRIPT_URL
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      script.remove()
      loading = null
      reject(new Error('Não foi possível carregar o VLibras. Verifique a conexão e tente novamente.'))
    }
    document.body.appendChild(script)
  })
  return loading
}
