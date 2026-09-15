import { geoArea, geoCentroid } from 'd3-geo'
import type { FeatureCollection, Feature, Geometry, Position } from 'geojson'
type Props = { name: string; 'ISO3166-1-Alpha-2': string; 'ISO3166-1-Alpha-3': string }
export type Country = {
  code: string
  name: string
  feature: Feature<Geometry, Props>
  center: [number, number]
}
const names = new Intl.DisplayNames(['ko'], { type: 'region' })
const codeOverrides: Record<string, string> = {
  France: 'FR',
  Norway: 'NO',
  Kosovo: 'XK',
  Taiwan: 'TW',
}
function orient(rings: Position[][]) {
  return geoArea({ type: 'Polygon', coordinates: rings }) > 2 * Math.PI
    ? rings.map((r) => [...r].reverse())
    : rings
}
export function prepareCountries(geo: FeatureCollection<Geometry, Props>): Country[] {
  return geo.features
    .filter((f) => f.geometry && f.properties['ISO3166-1-Alpha-2'] !== 'AQ')
    .map((source) => {
      const feature = structuredClone(source)
      if (feature.geometry.type === 'Polygon')
        feature.geometry.coordinates = orient(feature.geometry.coordinates)
      if (feature.geometry.type === 'MultiPolygon')
        feature.geometry.coordinates = feature.geometry.coordinates.map(orient)
      const iso = codeOverrides[feature.properties.name] || feature.properties['ISO3166-1-Alpha-2']
      const code = /^[A-Z]{2}$/.test(iso) ? iso : feature.properties['ISO3166-1-Alpha-3']
      let center = geoCentroid(feature) as [number, number]
      if (feature.geometry.type === 'MultiPolygon') {
        const largest = feature.geometry.coordinates.toSorted(
          (a, b) =>
            geoArea({ type: 'Polygon', coordinates: b }) -
            geoArea({ type: 'Polygon', coordinates: a }),
        )[0]
        center = geoCentroid({ type: 'Polygon', coordinates: largest })
      }
      return {
        code,
        name: /^[A-Z]{2}$/.test(code)
          ? names.of(code) || feature.properties.name
          : feature.properties.name,
        feature,
        center,
      }
    })
    .filter((c) => /^[A-Z]{2,3}$/.test(c.code))
}
let cache: Promise<Country[]> | undefined
export function loadCountries() {
  return (cache ??= fetch('/data/countries.geojson')
    .then((r) => {
      if (!r.ok) throw new Error('지도를 불러오지 못했습니다.')
      return r.json()
    })
    .then(prepareCountries)
    .catch((e) => {
      cache = undefined
      throw e
    }))
}
