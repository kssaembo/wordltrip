import { geoEqualEarth, geoPath, geoGraticule10 } from 'd3-geo'
import { useEffect, useMemo, useState } from 'react'
import { Search, Plus, Minus, Maximize } from 'lucide-react'
import type { Destination } from '../lib/model'
import { loadCountries } from '../lib/countries'
import type { Country } from '../lib/countries'
export function WorldMap({
  destinations,
  selected,
  onSelect,
  large = false,
}: {
  destinations: Destination[]
  selected?: string
  onSelect?: (c: Country) => void
  large?: boolean
}) {
  const [countries, setCountries] = useState<Country[]>([])
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState<[number, number]>([0, 0])
  useEffect(() => {
    loadCountries()
      .then(setCountries)
      .catch((e) => setError(e.message))
  }, [])
  const projection = useMemo(
    () =>
      geoEqualEarth().fitExtent(
        [
          [24, 25],
          [976, 495],
        ],
        { type: 'Sphere' },
      ),
    [],
  )
  const path = useMemo(() => geoPath(projection), [projection])
  const visited = new Set(destinations.map((d) => d.country_code))
  const points = destinations.map((d) => {
    const c = countries.find((c) => c.code === d.country_code)
    return c ? projection(c.center) : null
  })
  return (
    <div className={`map-wrap ${large ? 'map-large' : ''}`}>
      {onSelect && (
        <div className="map-top">
          <div className="map-search">
            <Search size={17} />
            <input
              aria-label="국가 검색"
              placeholder="어느 나라로 떠나볼까요?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <span className="map-hint">국가를 눌러 여행에 추가하세요</span>
        </div>
      )}
      {query && onSelect && (
        <div className="search-results">
          {countries
            .filter((c) =>
              (c.name + ' ' + c.feature.properties.name)
                .toLowerCase()
                .includes(query.toLowerCase()),
            )
            .slice(0, 12)
            .map((c) => (
              <button
                key={c.code}
                onClick={() => {
                  onSelect(c)
                  setQuery('')
                }}
              >
                {c.name}
                <span>
                  {c.code === 'KR' && !destinations.some((d) => d.kind === 'arrival')
                    ? '+ 도착 추가'
                    : visited.has(c.code)
                      ? '선택됨'
                      : '+ 추가'}
                </span>
              </button>
            ))}
          {!countries.some((c) =>
            (c.name + ' ' + c.feature.properties.name).toLowerCase().includes(query.toLowerCase()),
          ) && <p>검색 결과가 없습니다.</p>}
        </div>
      )}
      {error ? (
        <p role="alert">
          {error}{' '}
          <button
            onClick={() => {
              setError('')
              loadCountries()
                .then(setCountries)
                .catch((e) => setError(e.message))
            }}
          >
            다시 불러오기
          </button>
        </p>
      ) : (
        <svg
          viewBox="0 0 1000 520"
          className="world-map"
          role="img"
          aria-label={`세계지도. 여행 경로: ${destinations.map((d) => d.country_name).join(' → ') || '아직 선택한 국가 없음'}`}
        >
          <defs>
            <pattern id="sea-dots" width="12" height="12" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r=".7" fill="#b9d5d5" />
            </pattern>
          </defs>
          <rect width="1000" height="520" fill="url(#sea-dots)" />
          <g
            transform={`translate(${500 + pan[0]} ${260 + pan[1]}) scale(${zoom}) translate(-500 -260)`}
          >
            <path d={path(geoGraticule10()) ?? ''} fill="none" stroke="#c9dddd" strokeWidth=".6" />
            {countries.map((c) => (
              <path
                key={c.code}
                d={path(c.feature) ?? ''}
                className={`country ${visited.has(c.code) ? 'visited' : ''} ${c.code === selected ? 'selected' : ''}`}
                onClick={() => onSelect?.(c)}
              >
                <title>{c.name}</title>
              </path>
            ))}
            {points.map((p, i) => {
              const prev = points[i - 1]
              if (!p || !prev) return null
              return (
                <path
                  key={`line-${i}`}
                  d={`M${prev[0]},${prev[1]} Q${(prev[0] + p[0]) / 2},${Math.min(prev[1], p[1]) - Math.min(70, Math.abs(p[0] - prev[0]) * 0.2)} ${p[0]},${p[1]}`}
                  fill="none"
                  stroke="#ec8056"
                  strokeWidth="2.5"
                  strokeDasharray="5 5"
                />
              )
            })}
            {points.map(
              (p, i) =>
                p &&
                destinations.findIndex((d) => d.country_code === destinations[i].country_code) ===
                  i && (
                  <g
                    key={destinations[i].id}
                    onClick={() => {
                      const c = countries.find((c) => c.code === destinations[i].country_code)
                      if (c) onSelect?.(c)
                    }}
                    className="map-marker"
                  >
                    <circle
                      cx={p[0]}
                      cy={p[1]}
                      r={
                        destinations.filter((d) => d.country_code === destinations[i].country_code)
                          .length > 1
                          ? 17
                          : 13
                      }
                      fill="#fff"
                      stroke="#187c79"
                      strokeWidth="2"
                    />
                    <text
                      x={p[0]}
                      y={p[1] + 4}
                      textAnchor="middle"
                      fontSize="12"
                      fontWeight="800"
                      fill="#175c5b"
                    >
                      {destinations
                        .map((d, j) =>
                          d.country_code === destinations[i].country_code ? j + 1 : null,
                        )
                        .filter(Boolean)
                        .join('·')}
                    </text>
                  </g>
                ),
            )}
          </g>
        </svg>
      )}
      <div className="map-bottom">
        <span>
          <i className="legend-dot" /> 나의 여행지 <i className="legend-line" /> 여행 경로
        </span>
        {onSelect && (
          <div className="map-controls">
            <button aria-label="지도 확대" onClick={() => setZoom((z) => Math.min(4, z + 0.5))}>
              <Plus size={17} />
            </button>
            <button aria-label="지도 축소" onClick={() => setZoom((z) => Math.max(1, z - 0.5))}>
              <Minus size={17} />
            </button>
            <button
              aria-label="지도 초기화"
              onClick={() => {
                setZoom(1)
                setPan([0, 0])
              }}
            >
              <Maximize size={16} />
            </button>
            {zoom > 1 && (
              <>
                <button
                  aria-label="지도 왼쪽 이동"
                  onClick={() => setPan((p) => [p[0] + 100, p[1]])}
                >
                  ←
                </button>
                <button
                  aria-label="지도 오른쪽 이동"
                  onClick={() => setPan((p) => [p[0] - 100, p[1]])}
                >
                  →
                </button>
                <button
                  aria-label="지도 위쪽 이동"
                  onClick={() => setPan((p) => [p[0], p[1] + 80])}
                >
                  ↑
                </button>
                <button
                  aria-label="지도 아래쪽 이동"
                  onClick={() => setPan((p) => [p[0], p[1] - 80])}
                >
                  ↓
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
