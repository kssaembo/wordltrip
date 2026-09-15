import { it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { geoArea } from 'd3-geo'
import { prepareCountries } from '../src/lib/countries'
it('핵심 여행 국가를 모두 표시하고 GeoJSON 방향과 지도 중심점을 보정한다', () => {
  const countries = prepareCountries(
    JSON.parse(readFileSync(new URL('../public/data/countries.geojson', import.meta.url), 'utf8')),
  )
  for (const code of ['KR', 'JP', 'EG', 'FR', 'BR', 'NO', 'TW'])
    expect(countries.some((c) => c.code === code)).toBe(true)
  for (const c of countries) expect(geoArea(c.feature)).toBeLessThan(2 * Math.PI)
  const japan = countries.find((c) => c.code === 'JP')!
  expect(japan.center[0]).toBeGreaterThan(125)
  expect(japan.center[0]).toBeLessThan(150)
  expect(japan.center[1]).toBeGreaterThan(25)
  const france = countries.find((c) => c.code === 'FR')!
  expect(france.center[0]).toBeGreaterThan(-5)
  expect(france.center[0]).toBeLessThan(10)
  expect(new Set(countries.map((c) => c.code)).size).toBe(countries.length)
})
