import { describe, expect, it } from 'vitest'
import {
  EARTH_RADIUS_KM,
  boundsCenter,
  gridStepForZoom,
  haversineKm,
  isOnVisibleHemisphere,
  nearestCity,
  normalizeLon,
  pointKey,
  snapGrid,
  thinCities,
} from '@/domain/geo'
import type { Bounds, ScreenPoint } from '@/domain/geo'
import type { LatLon } from '@/domain/types'

const athens = { lat: 37.98, lon: 23.73 }
const thessaloniki = { lat: 40.64, lon: 22.94 }

describe('normalizeLon', () => {
  it.each([
    [0, 0],
    [179.5, 179.5],
    [180, -180],
    [-180, -180],
    [190, -170],
    [-190, 170],
    [540, -180],
    [-0, 0],
  ])('%f → %f', (input, expected) => {
    expect(normalizeLon(input)).toBe(expected)
  })
})

describe('haversineKm', () => {
  it('measures a known distance', () => {
    expect(haversineKm(athens, thessaloniki)).toBeCloseTo(303, -1)
  })

  it('is zero for the same point and symmetric', () => {
    expect(haversineKm(athens, athens)).toBe(0)
    expect(haversineKm(athens, thessaloniki)).toBeCloseTo(haversineKm(thessaloniki, athens), 9)
  })

  it('is half the circumference for antipodes', () => {
    expect(haversineKm({ lat: 0, lon: 0 }, { lat: 0, lon: 180 })).toBeCloseTo(Math.PI * EARTH_RADIUS_KM, 6)
  })

  it('takes the short way across the antimeridian', () => {
    expect(haversineKm({ lat: 0, lon: 179.5 }, { lat: 0, lon: -179.5 })).toBeCloseTo(111.2, 0)
  })

  it('treats every longitude at a pole as the same point', () => {
    expect(haversineKm({ lat: 90, lon: 0 }, { lat: 90, lon: 135 })).toBeCloseTo(0, 6)
    expect(haversineKm({ lat: -90, lon: -45 }, { lat: -89, lon: 100 })).toBeCloseTo(111.2, 0)
  })
})

describe('isOnVisibleHemisphere', () => {
  it('accepts points facing the camera and rejects the far side', () => {
    expect(isOnVisibleHemisphere(thessaloniki, athens)).toBe(true)
    expect(isOnVisibleHemisphere({ lat: -38, lon: -157 }, athens)).toBe(false)
  })

  it('applies a margin near the horizon', () => {
    const horizon = { lat: 0, lon: 85 }
    expect(isOnVisibleHemisphere(horizon, { lat: 0, lon: 0 })).toBe(true)
    expect(isOnVisibleHemisphere(horizon, { lat: 0, lon: 0 }, 10)).toBe(false)
  })
})

describe('nearestCity', () => {
  const cities = [
    { id: 1, ...athens },
    { id: 2, ...thessaloniki },
    { id: 3, lat: -16.5, lon: 179.9 },
  ]

  it('returns the closest city within range', () => {
    expect(nearestCity({ lat: 40.5, lon: 22.9 }, cities, 50)?.id).toBe(2)
  })

  it('returns null when nothing is within range (open sea)', () => {
    expect(nearestCity({ lat: 35, lon: 18 }, cities, 50)).toBeNull()
  })

  it('finds cities across the antimeridian', () => {
    expect(nearestCity({ lat: -16.5, lon: -179.9 }, cities, 50)?.id).toBe(3)
  })

  it('handles an empty list', () => {
    expect(nearestCity(athens, [], 50)).toBeNull()
  })
})

describe('pointKey', () => {
  it('rounds to the given precision', () => {
    expect(pointKey({ lat: 40.6401, lon: 22.9444 }, 2)).toBe('pt:40.64,22.94')
    expect(pointKey({ lat: 40.6, lon: 22 }, 2)).toBe('pt:40.60,22.00')
  })

  it('normalises negative zero and wrapped longitudes', () => {
    expect(pointKey({ lat: -0.001, lon: -0.001 }, 2)).toBe('pt:0.00,0.00')
    expect(pointKey({ lat: 10, lon: 180 }, 2)).toBe(pointKey({ lat: 10, lon: -180 }, 2))
    expect(pointKey({ lat: 10, lon: 370 }, 2)).toBe('pt:10.00,10.00')
  })

  it('gives nearby points the same key', () => {
    expect(pointKey({ lat: 40.641, lon: 22.938 }, 2)).toBe(pointKey({ lat: 40.639, lon: 22.941 }, 2))
  })
})

describe('thinCities', () => {
  const screen = { width: 800, height: 600 }
  const grid = { cols: 8, rows: 6 }
  type Item = { name: string, population: number, at: ScreenPoint | null }
  const project = (item: Item) => item.at

  it('keeps the most populous item per cell', () => {
    const items: Item[] = [
      { name: 'small', population: 10, at: { x: 10, y: 10 } },
      { name: 'big', population: 100, at: { x: 50, y: 50 } },
      { name: 'other-cell', population: 5, at: { x: 150, y: 10 } },
    ]
    expect(thinCities(items, project, screen, grid, 48).map(i => i.name)).toEqual(['big', 'other-cell'])
  })

  it('drops items that are hidden or off screen', () => {
    const items: Item[] = [
      { name: 'hidden', population: 1000, at: null },
      { name: 'left', population: 900, at: { x: -1, y: 10 } },
      { name: 'right-edge', population: 800, at: { x: 800, y: 10 } },
      { name: 'visible', population: 1, at: { x: 799, y: 599 } },
    ]
    expect(thinCities(items, project, screen, grid, 48).map(i => i.name)).toEqual(['visible'])
  })

  it('caps the result, most populous first', () => {
    const items: Item[] = Array.from({ length: 48 }, (_, i) => ({
      name: `c${i}`,
      population: i,
      at: { x: (i % 8) * 100 + 1, y: Math.floor(i / 8) * 100 + 1 },
    }))
    const kept = thinCities(items, project, screen, grid, 5)
    expect(kept.map(i => i.population)).toEqual([47, 46, 45, 44, 43])
  })
})

describe('gridStepForZoom', () => {
  it.each([
    [0, 15],
    [1.9, 15],
    [2, 10],
    [3.5, 5],
    [4, 2.5],
    [5, 1.25],
    [6, 0.5],
    [12, 0.5],
  ])('zoom %f → %f°', (zoom, step) => {
    expect(gridStepForZoom(zoom)).toBe(step)
  })
})

describe('snapGrid', () => {
  const onLattice = (value: number, step: number, origin: number) =>
    Number.isInteger((value - origin) / step - 0.5)

  it('returns cell centres on a fixed lattice inside the bounds', () => {
    const bounds: Bounds = { west: 20, south: 35, east: 30, north: 42 }
    const cells = snapGrid(bounds, 6, { maxPoints: 1000 })
    expect(cells.length).toBe(20 * 14)
    for (const cell of cells) {
      expect(cell.stepDeg).toBe(0.5)
      expect(onLattice(cell.lat, 0.5, -90)).toBe(true)
      expect(onLattice(cell.lon, 0.5, -180)).toBe(true)
      expect(cell.lat).toBeGreaterThan(35 - 0.5)
      expect(cell.lat).toBeLessThan(42 + 0.5)
    }
  })

  it('shares points between overlapping views', () => {
    const a = snapGrid({ west: 20, south: 35, east: 30, north: 42 }, 4, { maxPoints: 80 })
    const b = snapGrid({ west: 22.3, south: 36.1, east: 32.3, north: 43.1 }, 4, { maxPoints: 80 })
    const keys = (cells: LatLon[]) => new Set(cells.map(c => pointKey(c, 2)))
    const shared = [...keys(a)].filter(key => keys(b).has(key))
    expect(shared.length).toBeGreaterThan(0)
  })

  it('coarsens the step to stay under the cap', () => {
    const cells = snapGrid({ west: 0, south: 0, east: 40, north: 40 }, 6, { maxPoints: 80 })
    expect(cells.length).toBeLessThanOrEqual(80)
    expect(cells[0]?.stepDeg).toBe(5)
  })

  it('keeps the cells nearest the centre at the coarsest step', () => {
    const bounds: Bounds = { west: -180, south: -90, east: 180, north: 90 }
    const cells = snapGrid(bounds, 0, { maxPoints: 80 })
    expect(cells).toHaveLength(80)
    expect(cells.every(cell => cell.stepDeg === 15)).toBe(true)
    expect(cells.some(cell => cell.lat === 7.5 && cell.lon === 7.5)).toBe(true)
  })

  it('handles bounds that cross the antimeridian', () => {
    const expected = snapGrid({ west: 170, south: -10, east: 190, north: 10 }, 3, { maxPoints: 80 })
    const crossing = snapGrid({ west: 170, south: -10, east: -170, north: 10 }, 3, { maxPoints: 80 })
    expect(crossing).toEqual(expected)
    const lons = new Set(crossing.map(cell => cell.lon))
    expect(lons).toEqual(new Set([172.5, 177.5, -177.5, -172.5]))
    expect(crossing.every(cell => cell.lon >= -180 && cell.lon < 180)).toBe(true)
  })

  it('never produces cells beyond the poles', () => {
    const cells = snapGrid({ west: -30, south: 80, east: 30, north: 95 }, 2, { maxPoints: 80 })
    expect(cells.length).toBeGreaterThan(0)
    expect(cells.every(cell => cell.lat + cell.stepDeg / 2 <= 90)).toBe(true)
  })

  it('does not duplicate cells when the view wraps the whole world', () => {
    const cells = snapGrid({ west: -200, south: -10, east: 220, north: 10 }, 0, { maxPoints: 1000 })
    expect(cells).toHaveLength(2 * 24)
    expect(new Set(cells.map(c => `${c.lat},${c.lon}`)).size).toBe(cells.length)
  })

  it('applies the visibility filter before the cap', () => {
    const cells = snapGrid({ west: 0, south: 0, east: 20, north: 20 }, 6, {
      maxPoints: 80,
      isVisible: point => point.lat < 2 && point.lon < 2,
    })
    expect(cells).toHaveLength(16)
    expect(cells[0]?.stepDeg).toBe(0.5)
  })
})

describe('boundsCenter', () => {
  it('finds the centre across the antimeridian', () => {
    expect(boundsCenter({ west: 170, south: -10, east: -170, north: 10 })).toEqual({ lat: 0, lon: -180 })
    expect(boundsCenter({ west: 10, south: 0, east: 30, north: 20 })).toEqual({ lat: 10, lon: 20 })
  })
})

describe('normalizeLon precision', () => {
  it('returns in-range longitudes unchanged', () => {
    expect(normalizeLon(22.94)).toBe(22.94)
    expect(normalizeLon(-179.999)).toBe(-179.999)
  })
})
