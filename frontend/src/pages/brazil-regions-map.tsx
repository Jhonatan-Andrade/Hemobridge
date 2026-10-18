import brazilRegions from '../data/brazil-regions-ibge.json'

export type RegionId = 'north' | 'northeast' | 'centerwest' | 'southeast' | 'south'

type Position = [number, number]
type Geometry =
  | { type: 'Polygon'; coordinates: Position[][] }
  | { type: 'MultiPolygon'; coordinates: Position[][][] }
type RegionFeature = {
  properties: { id: RegionId; name: string; code: number }
  geometry: Geometry
}

const features = (brazilRegions as unknown as { features: RegionFeature[] }).features
const width = 600
const height = 500
const padding = 22
// Mantenha latitude e longitude na mesma unidade angular antes de calcular a escala.
const latitudeToMercator = (latitude: number) =>
  (Math.log(Math.tan(Math.PI / 4 + (latitude * Math.PI) / 360)) * 180) / Math.PI

function polygons(geometry: Geometry): Position[][][] {
  return geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
}

const positions = features.flatMap((feature) =>
  polygons(feature.geometry).flatMap((polygon) => polygon.flat()),
)
const longitudes = positions.map(([longitude]) => longitude)
const mercatorLatitudes = positions.map(([, latitude]) => latitudeToMercator(latitude))
const minLongitude = Math.min(...longitudes)
const maxLongitude = Math.max(...longitudes)
const minLatitude = Math.min(...mercatorLatitudes)
const maxLatitude = Math.max(...mercatorLatitudes)
const scale = Math.min(
  (width - padding * 2) / (maxLongitude - minLongitude),
  (height - padding * 2) / (maxLatitude - minLatitude),
)
const offsetX = (width - (maxLongitude - minLongitude) * scale) / 2
const offsetY = (height - (maxLatitude - minLatitude) * scale) / 2

function project([longitude, latitude]: Position) {
  return {
    x: offsetX + (longitude - minLongitude) * scale,
    y: offsetY + (maxLatitude - latitudeToMercator(latitude)) * scale,
  }
}

function pathFor(geometry: Geometry) {
  return polygons(geometry)
    .map((polygon) =>
      polygon
        .map(
          (ring) =>
            ring
              .map((point, index) => {
                const { x, y } = project(point)
                return `${index ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`
              })
              .join(' ') + ' Z',
        )
        .join(' '),
    )
    .join(' ')
}

const regionPaths = features.map((feature) => ({
  id: feature.properties.id,
  name: feature.properties.name,
  path: pathFor(feature.geometry),
}))

// Os rótulos ficam dentro de cada grande região; são posição de interface,
// não indicam unidade de saúde, doador nem intensidade de necessidade.
const labelPositions: Record<RegionId, Position> = {
  north: [-60.5, -4.5],
  northeast: [-40.3, -9.4],
  centerwest: [-54, -16],
  southeast: [-44.7, -21.6],
  south: [-51.2, -28.5],
}
const labels: Record<RegionId, string> = {
  north: 'N',
  northeast: 'NE',
  centerwest: 'CO',
  southeast: 'SE',
  south: 'S',
}

export function BrazilRegionsMap({
  selected,
  onSelect,
}: {
  selected: RegionId | 'all'
  onSelect: (region: RegionId) => void
}) {
  return (
    <div className="hb-pro-map-stage" role="group" aria-label="Selecionar uma região do Brasil">
      <svg
        className="hb-pro-map-shape"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Limites das cinco regiões do Brasil segundo a malha simplificada do IBGE"
      >
        {regionPaths.map((region) => (
          <path
            key={region.id}
            className={selected === region.id ? 'is-selected' : ''}
            d={region.path}
            onClick={() => onSelect(region.id)}
          />
        ))}
      </svg>
      {regionPaths.map((region) => {
        const point = project(labelPositions[region.id])
        return (
          <button
            type="button"
            key={region.id}
            className={`hb-pro-map-pin${selected === region.id ? ' is-selected' : ''}`}
            style={{ left: `${(point.x / width) * 100}%`, top: `${(point.y / height) * 100}%` }}
            onClick={() => onSelect(region.id)}
            aria-pressed={selected === region.id}
            aria-label={`Selecionar região ${region.name}`}
          >
            {labels[region.id]}
          </button>
        )
      })}
    </div>
  )
}
