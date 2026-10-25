import { useCallback, useState } from 'react'

type Posicao = { lat: number; lng: number }
type Estado = { posicao: Posicao | null; carregando: boolean; erro: string | null }

/** Localização do navegador, pedida só quando a pessoa escolhe usá-la. */
export function useLocalizacao() {
  const [estado, setEstado] = useState<Estado>({ posicao: null, carregando: false, erro: null })

  const solicitar = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setEstado({ posicao: null, carregando: false, erro: 'Seu navegador não permite usar a localização.' })
      return
    }
    setEstado((e) => ({ ...e, carregando: true, erro: null }))
    navigator.geolocation.getCurrentPosition(
      (p) => setEstado({ posicao: { lat: p.coords.latitude, lng: p.coords.longitude }, carregando: false, erro: null }),
      () => setEstado({ posicao: null, carregando: false, erro: 'Não foi possível obter sua localização. Verifique a permissão do navegador.' }),
      { timeout: 10000, maximumAge: 300000 },
    )
  }, [])

  const limpar = useCallback(() => setEstado({ posicao: null, carregando: false, erro: null }), [])
  return { ...estado, solicitar, limpar }
}
