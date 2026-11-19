import type { LatLon } from '@/domain/types'
import { roundTo } from '@/domain/units'

/** Mean Earth radius (IUGG). */
export const EARTH_RADIUS_KM = 6371.0088

const DEG_TO_RAD = Math.PI / 180
const RAD_TO_DEG = 180 / Math.PI
const FULL_TURN_DEG = 360
const HALF_TURN_DEG = 180
const MAX_LAT = 90
const HEMISPHERE_DEG = 90

/** Wraps a longitude into [-180, 180). */
export function normalizeLon(lon: number): number {
  if (lon >= -HALF_TURN_DEG && lon < HALF_TURN_DEG) {
    return lon === 0 ? 0 : lon
  }
  const wrapped = ((((lon + HALF_TURN_DEG) % FULL_TURN_DEG) + FULL_TURN_DEG) % FULL_TURN_DEG) - HALF_TURN_DEG
  return wrapped === 0 ? 0 : wrapped
}

/** Central angle between two points, in degrees. */
export function centralAngleDeg(a: LatLon, b: LatLon): number {
  const dLat = (b.lat - a.lat) * DEG_TO_RAD
  const dLon = (b.lon - a.lon) * DEG_TO_RAD
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(a.lat * DEG_TO_RAD) * Math.cos(b.lat * DEG_TO_RAD) * Math.sin(dLon / 2) ** 2
  return 2 * Math.asin(Math.min(1, Math.sqrt(h))) * RAD_TO_DEG
}

/** Great-circle distance between two points, in kilometres. */
export function haversineKm(a: LatLon, b: LatLon): number {
  return centralAngleDeg(a, b) * DEG_TO_RAD * EARTH_RADIUS_KM
}

/**
 * Whether `point` faces the camera on a globe centred on `center`.
 * Map bounds are only approximate on a globe, so candidates are filtered
 * with this before being projected to the screen.
 */
export function isOnVisibleHemisphere(point: LatLon, center: LatLon, marginDeg = 0): boolean {
  return centralAngleDeg(point, center) < HEMISPHERE_DEG - marginDeg
}

/** The closest item within `maxKm` of `point`, or `null`. */
export function nearestCity<T extends LatLon>(point: LatLon, cities: readonly T[], maxKm: number): T | null {
  let best: T | null = null
  let bestKm = maxKm
  for (const city of cities) {
    const km = haversineKm(point, city)
    if (km <= bestKm) {
      best = city
      bestKm = km
    }
  }
  return best
}

/** A coordinate rounded for cache keys and request URLs. */
export function roundCoord(value: number, precision: number): number {
  return roundTo(value, precision)
}

/** Cache key for a free point: `pt:<lat>,<lon>` rounded to `precision` decimals. */
export function pointKey(point: LatLon, precision: number): string {
  const lat = roundCoord(point.lat, precision).toFixed(precision)
  const lon = roundCoord(normalizeLon(point.lon), precision).toFixed(precision)
  return `pt:${lat},${lon}`
}

export interface ScreenPoint {
  x: number
  y: number
}

export interface ScreenSize {
  width: number
  height: number
}

export interface GridSize {
  cols: number
  rows: number
}

/**
 * Keeps the most populous item per cell of a `grid` laid over the screen,
 * capped at `max`, most populous first. `project` returns `null` for items
 * that are not visible (e.g. on the far side of the globe).
 */
export function thinCities<T extends { population: number }>(
  items: readonly T[],
  project: (item: T) => ScreenPoint | null,
  screen: ScreenSize,
  grid: GridSize,
  max: number,
): T[] {
  const cellWidth = screen.width / grid.cols
  const cellHeight = screen.height / grid.rows
  const best = new Map<number, T>()
  for (const item of items) {
    const p = project(item)
    if (!p || p.x < 0 || p.y < 0 || p.x >= screen.width || p.y >= screen.height) {
      continue
    }
    const cell = Math.floor(p.y / cellHeight) * grid.cols + Math.floor(p.x / cellWidth)
    const current = best.get(cell)
    if (!current || item.population > current.population) {
      best.set(cell, item)
    }
  }
  return [...best.values()].sort((a, b) => b.population - a.population).slice(0, max)
}

export interface Bounds {
  west: number
  south: number
  east: number
  north: number
}

/** Grid step in degrees by minimum zoom, finest first. */
export const GRID_STEPS: readonly { minZoom: number, stepDeg: number }[] = [
  { minZoom: 6, stepDeg: 0.5 },
  { minZoom: 5, stepDeg: 1.25 },
  { minZoom: 4, stepDeg: 2.5 },
  { minZoom: 3, stepDeg: 5 },
  { minZoom: 2, stepDeg: 10 },
  { minZoom: 0, stepDeg: 15 },
]

const COARSEST_STEP = GRID_STEPS[GRID_STEPS.length - 1]?.stepDeg ?? HALF_TURN_DEG

/** The grid step for a zoom level. */
export function gridStepForZoom(zoom: number): number {
  return GRID_STEPS.find(step => zoom >= step.minZoom)?.stepDeg ?? COARSEST_STEP
}

export interface GridCell extends LatLon {
  /** Cell size in degrees; the cell spans ±step/2 around its centre. */
  stepDeg: number
}

export interface SnapGridOptions {
  maxPoints: number
  /** Extra filter, e.g. "faces the camera"; applied before the cap. */
  isVisible?: (point: LatLon) => boolean
}

function cellsFor(bounds: Bounds, stepDeg: number, isVisible: (point: LatLon) => boolean): GridCell[] {
  const south = Math.max(-MAX_LAT, Math.min(bounds.south, bounds.north))
  const north = Math.min(MAX_LAT, Math.max(bounds.south, bounds.north))
  let east = bounds.east
  while (east < bounds.west) {
    east += FULL_TURN_DEG
  }
  const west = bounds.west
  const spanLon = Math.min(east - west, FULL_TURN_DEG)

  const firstRow = Math.floor((south + MAX_LAT) / stepDeg)
  const lastRow = Math.min(Math.ceil((north + MAX_LAT) / stepDeg), (2 * MAX_LAT) / stepDeg) - 1
  const firstCol = Math.floor((west + HALF_TURN_DEG) / stepDeg)
  const lastCol = Math.ceil((west + spanLon + HALF_TURN_DEG) / stepDeg) - 1
  const colsAround = FULL_TURN_DEG / stepDeg

  const seen = new Set<number>()
  const cells: GridCell[] = []
  for (let row = firstRow; row <= lastRow; row++) {
    const lat = -MAX_LAT + (row + 0.5) * stepDeg
    for (let col = firstCol; col <= lastCol; col++) {
      const wrappedCol = ((col % colsAround) + colsAround) % colsAround
      const id = row * colsAround + wrappedCol
      if (seen.has(id)) {
        continue
      }
      seen.add(id)
      const cell = { lat, lon: -HALF_TURN_DEG + (wrappedCol + 0.5) * stepDeg, stepDeg }
      if (isVisible(cell)) {
        cells.push(cell)
      }
    }
  }
  return cells
}

/**
 * Cell centres of a global lat/lon lattice covering `bounds`. The step comes
 * from the zoom level and gets coarser until at most `maxPoints` cells remain;
 * at the coarsest step the cells nearest the centre of the bounds are kept.
 * Centres sit on a fixed lattice, so overlapping views share points and
 * therefore cache entries. Handles bounds that cross the antimeridian.
 */
export function snapGrid(bounds: Bounds, zoom: number, options: SnapGridOptions): GridCell[] {
  const isVisible = options.isVisible ?? (() => true)
  const startStep = gridStepForZoom(zoom)
  const steps = GRID_STEPS.map(step => step.stepDeg).filter(step => step >= startStep)
  let cells: GridCell[] = []
  for (const step of steps) {
    cells = cellsFor(bounds, step, isVisible)
    if (cells.length <= options.maxPoints) {
      return cells
    }
  }
  const center = boundsCenter(bounds)
  return cells
    .map(cell => ({ cell, angle: centralAngleDeg(cell, center) }))
    .sort((a, b) => a.angle - b.angle)
    .slice(0, options.maxPoints)
    .map(({ cell }) => cell)
}

/** Centre of bounds, antimeridian aware. */
export function boundsCenter(bounds: Bounds): LatLon {
  let east = bounds.east
  while (east < bounds.west) {
    east += FULL_TURN_DEG
  }
  return { lat: (bounds.south + bounds.north) / 2, lon: normalizeLon((bounds.west + east) / 2) }
}
