import { useEffect, useRef, useState } from 'react'
import { Alert, Intro } from '../components/ui'
import { LocationSelects } from '../components/location-selects'
import { api, ApiError, messageOf } from '../services/api-client'
import type { SessionUser } from '../types/domain'
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

type Coordinates = { lat: number; lng: number }
type RecommendedLocations = {
  tipoDoador: string
  referencia: { cidade: string; estado: string }
  elegibilidade: {
    elegivel: boolean
    mensagem?: string
    exigeAutorizacaoResponsavel: boolean
  }
  dataEstimadaElegibilidade: string | null
  orientacao: string
  itens: {
    id: string
    hospital: {
      nome: string
      endereco: string
      cidade: string
      estado: string
      horarioFuncionamento: string | null
    }
    tipoNecessitado: string
    nivel: 'CRITICO' | 'BAIXO' | 'ESTAVEL'
    atualizadoEm: string | null
    distanciaKm: number | null
  }[]
}
const needLabels = { CRITICO: 'Crítico', BAIXO: 'Baixo', ESTAVEL: 'Estável' }
const dateLabel = (value: string) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`))

function DonorRecommendations({ coordinates }: { coordinates: Coordinates | null }) {
  const [revision, setRevision] = useState(0)
  const query = coordinates ? `?${new URLSearchParams({ lat: String(coordinates.lat), lng: String(coordinates.lng) })}` : ''
  const [visible, setVisible] = useState({ query: '', count: 6 })
  const visibleCount = visible.query === query ? visible.count : 6
  const [response, setResponse] = useState<{
    query: string
    revision: number
    data?: RecommendedLocations
    failure?: { message: string; restricted: boolean }
  } | null>(null)
  const loading = response?.query !== query || response.revision !== revision
  const result = loading ? null : response.data
  const failure = loading ? null : response.failure
  useEffect(() => {
    const controller = new AbortController()
    api<RecommendedLocations>(`/paciente/locais-recomendados${query}`, { signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) setResponse({ query, revision, data }) })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setResponse({ query, revision, failure: { message: messageOf(error), restricted: error instanceof ApiError && error.status === 403 } })
      })
    return () => controller.abort()
  }, [query, revision])
  return (
    <section className="surface hb-locals-search" aria-labelledby="recommended-locations-title" aria-busy={loading}>
      <span className="eyebrow">Doação compatível</span>
      <h2 id="recommended-locations-title">Instituições que precisam de você</h2>
      {loading && <p role="status">Consultando necessidades compatíveis com seu cadastro…</p>}
      {failure && <Alert tone={failure.restricted ? 'info' : 'error'}>
        <p>{failure.message}</p>
        {!failure.restricted && <button className="button secondary" onClick={() => setRevision((value) => value + 1)}>Tentar novamente</button>}
      </Alert>}
      {result && <>
        <p>Tipo validado: <strong>{result.tipoDoador}</strong>. Referência do cadastro: {result.referencia.cidade} / {result.referencia.estado}.</p>
        <p className="hb-locals-help">Ordem: necessidade mais urgente, seu tipo exato, sua cidade e seu estado. A distância, quando autorizada, desempata essas prioridades.</p>
        <Alert tone={result.elegibilidade.elegivel ? 'info' : 'warning'}>
          <p>{result.elegibilidade.elegivel ? 'Sua estimativa permite iniciar a jornada de doação.' : result.elegibilidade.mensagem}</p>
          <p>{result.dataEstimadaElegibilidade ? `Data estimada para doar: ${dateLabel(result.dataEstimadaElegibilidade)}.` : 'Não há uma data estimada de liberação. Consulte a equipe responsável.'}</p>
          {result.elegibilidade.exigeAutorizacaoResponsavel && <p>É necessária autorização do responsável para menores de 18 anos.</p>}
        </Alert>
        <p className="hb-locals-help">{result.orientacao}</p>
        {result.itens.length === 0 ? <p role="status">Nenhuma instituição cadastrada informou necessidade crítica, baixa ou estável compatível neste momento. Você pode explorar a busca pública abaixo.</p> : (
          <div className="hb-locals-service-list" aria-label="Necessidades compatíveis em ordem de prioridade">
            {result.itens.slice(0, visibleCount).map((item) => <article className="hb-locals-service" key={item.id}>
              <span className="badge">{needLabels[item.nivel]} · precisa de {item.tipoNecessitado}</span>
              <h3>{item.hospital.nome}</h3>
              <p>{item.hospital.endereco} · {item.hospital.cidade} / {item.hospital.estado}</p>
              {item.hospital.horarioFuncionamento && <p>Atendimento: {item.hospital.horarioFuncionamento}</p>}
              <p>{item.atualizadoEm ? `Necessidade atualizada em ${new Date(item.atualizadoEm).toLocaleString('pt-BR')}.` : 'Data de atualização não informada.'}</p>
              {item.distanciaKm !== null && <p>Distância aproximada em linha reta: {item.distanciaKm.toLocaleString('pt-BR')} km.</p>}
              <a className="button secondary" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.hospital.nome}, ${item.hospital.endereco}, ${item.hospital.cidade}, ${item.hospital.estado}`)}`} target="_blank" rel="noopener noreferrer">Ver endereço no Google Maps ↗</a>
            </article>)}
            {result.itens.length > visibleCount && <button className="button secondary" onClick={() => setVisible({ query, count: visibleCount + 6 })}>Mostrar mais necessidades ({result.itens.length - visibleCount} restantes)</button>}
          </div>
        )}
      </>}
    </section>
  )
}

export function LocalDiscovery({ user }: { user?: SessionUser | null }) {
  const [locality, setLocality] = useState({ state: '', city: '' })
  const city = locality.city ? `${locality.city}, ${locality.state}` : ''
  const alive = useRef(true)
  const locationRequest = useRef(0)
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
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null)
  const hasCity = city.trim().length >= 3

  function useApproximateLocation() {
    if (locating) return
    if (!navigator.geolocation) {
      setLocationMessage(
        'Seu navegador não oferece localização. Você ainda pode explorar o mapa e buscar pela cidade.',
      )
      return
    }
    setLocating(true)
    const request = ++locationRequest.current
    setLocationMessage('Aguardando a permissão de localização do navegador…')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (!alive.current || request !== locationRequest.current) return
        setCoordinates({ lat: Math.round(coords.latitude * 100) / 100, lng: Math.round(coords.longitude * 100) / 100 })
        setMapUrl(nearbyMapUrl(coords.latitude, coords.longitude))
        setMapLabel('sua região aproximada')
        setLocationMessage(
          'Mapa centralizado em sua região aproximada. O marcador indica sua posição, não um local de atendimento.',
        )
        setLocating(false)
      },
      () => {
        if (!alive.current || request !== locationRequest.current) return
        setLocationMessage(
          'Não foi possível obter sua localização. Busque pela cidade ou explore o mapa manualmente.',
        )
        setLocating(false)
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 },
    )
  }

  function resetMap() {
    locationRequest.current++
    setLocating(false)
    setCoordinates(null)
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

      {user?.perfil === 'PACIENTE' && <DonorRecommendations key={user.id} coordinates={coordinates} />}

      <div className="hb-locals-layout">
        <section className="surface hb-locals-search" aria-labelledby="hb-locals-search-title">
          <span className="eyebrow">Perto de você</span>
          <h2 id="hb-locals-search-title">O que você procura?</h2>
          <LocationSelects
            state={locality.state}
            city={locality.city}
            onChange={(state, city) => {
              locationRequest.current++
              setLocating(false)
              setCoordinates(null)
              setMapUrl(brazilMap)
              setMapLabel('Brasil')
              setLocationMessage(city ? `Busca manual em ${city} (${state}).` : 'Selecione um município para buscar.')
              setLocality({ state, city })
            }}
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
            enviada ao OpenStreetMap para centrar o mapa e, se você acessou sua conta de paciente,
            ao HemoBridge para desempatar recomendações por distância. Ela não é salva no seu cadastro.
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
