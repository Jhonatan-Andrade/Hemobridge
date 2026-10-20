import { useEffect, useRef, useState } from 'react'
import { Intro } from '../components/ui'
import { LocationSelects } from '../components/location-selects'
import '../styles/local-discovery.css'

type Service = { id: string; title: string; description: string; search: string }

// Buscas genéricas, sem cadastro de estabelecimentos ou afirmação de serviço disponível.
const services: readonly Service[] = [
  {
    id: 'doacao',
    title: 'Doação de sangue',
    description:
      'Procure hemocentros e serviços de hemoterapia. Confirme coleta, horários e critérios diretamente com a unidade.',
    search: 'hemocentro doação de sangue',
  },
  {
    id: 'sangue',
    title: 'Exame de sangue',
    description:
      'Encontre laboratórios de análises clínicas e confirme se realizam o exame solicitado pela equipe.',
    search: 'laboratório de análises clínicas exame de sangue',
  },
  {
    id: 'adicionais',
    title: 'Exames adicionais',
    description:
      'Para outros exames pedidos pela equipe, confira o procedimento exato e as orientações de preparo com o local.',
    search: 'laboratório de análises clínicas',
  },
]

const brazilMap =
  'https://www.openstreetmap.org/export/embed.html?bbox=-75%2C-35%2C-32%2C7&layer=mapnik'

function mapsSearchUrl(service: Service, city: string) {
  const query = `${service.search} em ${city.trim()}`
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

function nearbyMapUrl(latitude: number, longitude: number) {
  // Posição aproximada (~1 km), enviada ao OpenStreetMap só após pedido explícito.
  const lat = Math.round(latitude * 100) / 100
  const lon = Math.round(longitude * 100) / 100
  const bbox = [lon - 0.15, lat - 0.11, lon + 0.15, lat + 0.11]
    .map((value) => value.toFixed(3))
    .join(',')
  const params = new URLSearchParams({ bbox, layer: 'mapnik', marker: `${lat},${lon}` })
  return `https://www.openstreetmap.org/export/embed.html?${params}`
}

export function LocalDiscovery() {
  const [locality, setLocality] = useState({ state: '', city: '' })
  const city = locality.city ? `${locality.city}, ${locality.state}` : ''
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  const [mapUrl, setMapUrl] = useState(brazilMap)
  const [mapLabel, setMapLabel] = useState('Brasil')
  const [locating, setLocating] = useState(false)
  const [locationMessage, setLocationMessage] = useState('')
  const hasCity = city.trim().length >= 3

  function useApproximateLocation() {
    if (!navigator.geolocation) {
      setLocationMessage(
        'Seu navegador não oferece localização. Você ainda pode explorar o mapa e buscar pela cidade.',
      )
      return
    }
    setLocating(true)
    setLocationMessage('Aguardando a permissão de localização do navegador…')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (!alive.current) return
        setMapUrl(nearbyMapUrl(coords.latitude, coords.longitude))
        setMapLabel('sua região aproximada')
        setLocationMessage(
          'Mapa centralizado em sua região aproximada. O marcador indica sua posição, não um local de atendimento.',
        )
        setLocating(false)
      },
      () => {
        if (!alive.current) return
        setLocationMessage(
          'Não foi possível obter sua localização. Busque pela cidade ou explore o mapa manualmente.',
        )
        setLocating(false)
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 },
    )
  }

  function resetMap() {
    setMapUrl(brazilMap)
    setMapLabel('Brasil')
    setLocationMessage('Mapa do Brasil restaurado.')
  }

  return (
    <main className="hb-locals">
      <Intro
        title="Encontrar locais"
        description="Explore sua região e procure onde realizar exames ou doar sangue."
      />
      <p className="hb-locals-lead">
        Escolha o serviço e informe sua cidade. As buscas abrem no Google Maps; confirme com cada
        unidade se o atendimento desejado está disponível antes de se deslocar.
      </p>

      <div className="hb-locals-layout">
        <section className="surface hb-locals-search" aria-labelledby="hb-locals-search-title">
          <span className="eyebrow">Perto de você</span>
          <h2 id="hb-locals-search-title">O que você procura?</h2>
          <LocationSelects
            state={locality.state}
            city={locality.city}
            onChange={(state, city) => setLocality({ state, city })}
          />
          <p id="hb-locals-city-help" className="hb-locals-help">
            Informe apenas cidade e estado, sem endereço pessoal. A busca é enviada ao Google Maps
            somente quando você abre um dos links.
          </p>
          <div className="hb-locals-service-list" aria-label="Tipos de serviço">
            {services.map((service) => (
              <article className="hb-locals-service" key={service.id}>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
                {hasCity ? (
                  <a
                    className="button secondary"
                    href={mapsSearchUrl(service, city)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Buscar ${service.title.toLowerCase()} em ${city.trim()} no Google Maps (abre nova aba)`}
                  >
                    Buscar no Google Maps ↗
                  </a>
                ) : (
                  <button
                    className="button secondary"
                    type="button"
                    disabled
                    aria-label={`Informe cidade e UF para buscar ${service.title.toLowerCase()}`}
                  >
                    Informe sua cidade
                  </button>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="surface hb-locals-map" aria-labelledby="hb-locals-map-title">
          <div className="hb-locals-map-header">
            <div>
              <span className="eyebrow">Explore a região</span>
              <h2 id="hb-locals-map-title">Mapa de referência</h2>
            </div>
            <span className="hb-locals-map-area">{mapLabel}</span>
          </div>
          <div className="hb-locals-map-frame">
            <iframe
              key={mapUrl}
              title="Mapa interativo de referência do OpenStreetMap, sem estabelecimentos verificados"
              src={mapUrl}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
          <div className="hb-locals-map-tools">
            <button
              className="button"
              type="button"
              onClick={useApproximateLocation}
              disabled={locating}
              aria-busy={locating}
            >
              {locating ? 'Localizando…' : 'Ver minha região'}
            </button>
            {mapLabel !== 'Brasil' && (
              <button className="button secondary" type="button" onClick={resetMap}>
                Ver Brasil
              </button>
            )}
          </div>
          <p className="hb-locals-help">
            Ao usar sua localização, o navegador solicita permissão. Uma posição aproximada é
            enviada ao OpenStreetMap para centrar o mapa; ela não é guardada pelo HemoBridge nesta
            página.
          </p>
          <p className="hb-locals-map-status" role="status">
            {locationMessage}
          </p>
          <p className="hb-locals-attribution">
            Mapa:{' '}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
            >
              © OpenStreetMap contributors
            </a>
            . Não há locais de atendimento confirmados marcados neste mapa.
          </p>
        </section>
      </div>

      <aside className="hb-locals-reference" aria-label="Informação sobre locais de doação">
        <div>
          <span className="eyebrow">Fonte oficial</span>
          <h2>Hemocentros no Brasil</h2>
          <p>
            O Ministério da Saúde mantém uma lista de hemocentros. O documento disponível foi
            atualizado em 2023; confirme endereço, serviço e horário nos canais da unidade.
          </p>
        </div>
        <a
          className="button secondary"
          href="https://www.gov.br/saude/pt-br/composicao/saes/doacao-de-sangue/arquivos/lista-de-hemocentros.pdf/view"
          target="_blank"
          rel="noopener noreferrer"
        >
          Consultar lista do Ministério da Saúde ↗
        </a>
      </aside>
    </main>
  )
}
