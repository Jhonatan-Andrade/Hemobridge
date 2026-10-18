import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const dir = dirname(fileURLToPath(import.meta.url))
const collection = JSON.parse(readFileSync(resolve(dir, '../src/data/brazilRegionsIbge.json'), 'utf8'))
const width = 600
const height = 500
const padding = 22
const polygons = (geometry) => geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
const points = collection.features.flatMap((feature) => polygons(feature.geometry).flatMap((polygon) => polygon.flat()))
const mercator = (latitude) => Math.log(Math.tan(Math.PI / 4 + latitude * Math.PI / 360)) * 180 / Math.PI
const minLon = Math.min(...points.map(([longitude]) => longitude))
const maxLon = Math.max(...points.map(([longitude]) => longitude))
const minLat = Math.min(...points.map(([, latitude]) => mercator(latitude)))
const maxLat = Math.max(...points.map(([, latitude]) => mercator(latitude)))
const scale = Math.min((width - padding * 2) / (maxLon - minLon), (height - padding * 2) / (maxLat - minLat))
const offsetX = (width - (maxLon - minLon) * scale) / 2
const offsetY = (height - (maxLat - minLat) * scale) / 2
const pathFor = (geometry) => polygons(geometry).map((polygon) => polygon.map((ring) =>
  ring.map(([longitude, latitude], index) => {
    const x = offsetX + (longitude - minLon) * scale
    const y = offsetY + (maxLat - mercator(latitude)) * scale
    return `${index ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`
  }).join(' ') + ' Z',
).join(' ')).join(' ')

const paths = collection.features.map((feature) =>
  `<path id="regiao-${feature.properties.id}" d="${pathFor(feature.geometry)}" fill="#DDE5E8" stroke="#70858D" stroke-width="1.8" stroke-linejoin="round"/>`,
).join('\n')
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Limites das cinco regiões do Brasil segundo o IBGE">\n${paths}\n</svg>\n`
const output = resolve(dir, '../public/hemobridge/mapa-regioes-ibge.svg')
writeFileSync(output, svg, 'utf8')
console.log(`${output} (${Buffer.byteLength(svg)} bytes)`)
