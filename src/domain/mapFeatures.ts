import { cityKey } from '@/domain/places'
import type { GridCell } from '@/domain/geo'
import type { City, HourlySeries, LayerId, LatLon, Place } from '@/domain/types'
import { describeWeather } from '@/domain/wmo'

/*
 * Pure builders for the map's GeoJSON. Values are looked up by instant
 * (unix seconds), not by array index, so series fetched at different times
 * (and therefore starting at different hours) still line up.
 */

export const HOUR_SEC = 3600
const HALF_HOUR_SEC = HOUR_SEC / 2
const MS_PER_SEC = 1000
const FULL_TURN_DEG = 360
const HALF_TURN_DEG = 180

/** Prefix of every image the app registers on the map. */
export const MAP_IMAGE_PREFIX = 'wx-'
/** Grey dot-and-bar shown for cities whose weather is still loading. */
export const PLACEHOLDER_IMAGE = `${MAP_IMAGE_PREFIX}placeholder`

const WIND_ARROW_STEP_DEG = 22.5
const WIND_ARROW_COUNT = 16

/** Angles of the pre-rotated wind arrow sprites (icons inside text can't be rotated). */
export const WIND_ARROW_ANGLES: readonly number[] = Array.from({ length: WIND_ARROW_COUNT }, (_, i) => Math.round(i * WIND_ARROW_STEP_DEG))

/** Sprite name for an arrow pointing `toDeg` (clockwise from north). */
export function windArrowImage(toDeg: number): string {
  const step = ((Math.round(toDeg / WIND_ARROW_STEP_DEG) % WIND_ARROW_COUNT) + WIND_ARROW_COUNT) % WIND_ARROW_COUNT
  return `${MAP_IMAGE_PREFIX}wind-arrow-${WIND_ARROW_ANGLES[step] ?? 0}`
}

export interface PointFeature<P> {
  type: 'Feature'
  id?: number | string
  geometry: { type: 'Point', coordinates: [number, number] }
  properties: P
}

export interface FeatureCollection<F> {
  type: 'FeatureCollection'
  features: F[]
}

/** Start of the hour containing `ms`, in unix seconds. */
export function hourStartSec(ms: number): number {
  return Math.floor(ms / MS_PER_SEC / HOUR_SEC) * HOUR_SEC
}

/**
 * Index of the hourly slot nearest to `instantSec`, or -1 when no slot is
 * within half an hour (e.g. the instant is outside the series).
 * Tolerates locations whose local hours fall on half or quarter UTC hours.
 */
export function hourIndexAt(timesSec: readonly number[], instantSec: number): number {
  const first = timesSec[0]
  if (first === undefined) {
    return -1
  }
  const index = Math.round((instantSec - first) / HOUR_SEC)
  const slot = timesSec[index]
  return slot !== undefined && Math.abs(slot - instantSec) <= HALF_HOUR_SEC ? index : -1
}

/** The value a layer shows for one hourly slot. */
export function layerValue(series: HourlySeries, layer: LayerId, index: number): number | null {
  const source = {
    temperature: series.tempC,
    precipitation: series.precipMm,
    wind: series.windKmh,
    clouds: series.cloudPct,
  }[layer]
  return source[index] ?? null
}

export interface CityFeatureProps {
  id: number
  name: string
  /** Layer value in metric base units, or `null` when missing. */
  value: number | null
  label: string
  /** Map image drawn in front of the label (weather icon or wind arrow). */
  icon: string
  population: number
  /** `true` while the city's weather is still loading. */
  loading: boolean
}

export interface SymbolOptions {
  layer: LayerId
  instantSec: number
  /** Formats a layer value for display; receives `null` for missing values. */
  label: (value: number | null, layer: LayerId) => string
  /** Show placeholders for cities without data (while a request is running). */
  loading?: boolean
}

interface Symbol {
  value: number | null
  label: string
  icon: string
}

/** Icon, rotation, value and label for one location at an instant; `null` without data. */
export function symbolAt(series: HourlySeries, options: SymbolOptions): Symbol | null {
  const index = hourIndexAt(series.timesSec, options.instantSec)
  if (index < 0) {
    return null
  }
  const value = layerValue(series, options.layer, index)
  const label = options.label(value, options.layer)
  if (options.layer === 'wind') {
    const fromDeg = series.windDirDeg[index]
    const icon = fromDeg == null ? PLACEHOLDER_IMAGE : windArrowImage((fromDeg + HALF_TURN_DEG) % FULL_TURN_DEG)
    return { value, label, icon }
  }
  const weather = describeWeather(series.weatherCode[index], series.isDay[index] ?? true)
  return { value, label, icon: `${MAP_IMAGE_PREFIX}${weather.icon}` }
}

const point = (place: LatLon): PointFeature<never>['geometry'] => ({ type: 'Point', coordinates: [place.lon, place.lat] })

/**
 * City symbols for the map. Cities without data at the instant are left out,
 * or shown as placeholders while `options.loading` is set.
 */
export function buildCityFeatures(
  cities: readonly City[],
  data: ReadonlyMap<string, { data: HourlySeries }>,
  options: SymbolOptions,
): FeatureCollection<PointFeature<CityFeatureProps>> {
  const features: PointFeature<CityFeatureProps>[] = []
  for (const city of cities) {
    const series = data.get(cityKey(city))?.data
    const symbol = series ? symbolAt(series, options) : null
    if (!symbol && !options.loading) {
      continue
    }
    features.push({
      type: 'Feature',
      id: city.id,
      geometry: point(city),
      properties: {
        id: city.id,
        name: city.name,
        population: city.population,
        loading: !symbol,
        ...(symbol ?? { value: null, label: '', icon: PLACEHOLDER_IMAGE }),
      },
    })
  }
  return { type: 'FeatureCollection', features }
}

export interface PolygonFeature<P> {
  type: 'Feature'
  geometry: { type: 'Polygon', coordinates: [number, number][][] }
  properties: P
}

export interface GridFeatureProps {
  /** Layer value in metric base units. */
  value: number
}

export interface GridOptions {
  layer: LayerId
  instantSec: number
  /** Cache key of a cell (the same key used to fetch it). */
  keyOf: (cell: GridCell) => string
  /**
   * Sub-cells per side. 1 draws each cell flat; more splits it into
   * n × n sub-cells interpolated between neighbouring grid points.
   */
  subdivisions?: number
}

const MAX_LAT = 90
const FULL_TURN = 360

type Polygon = PolygonFeature<GridFeatureProps>

function square(west: number, south: number, east: number, north: number, value: number): Polygon {
  const s = Math.max(-MAX_LAT, south)
  const n = Math.min(MAX_LAT, north)
  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [[[west, s], [east, s], [east, n], [west, n], [west, s]]] },
    properties: { value },
  }
}

/**
 * Colour grid polygons. Values come only from the fetched grid points; with
 * `subdivisions` > 1 each cell is drawn as smaller squares whose values are
 * interpolated (bilinear) between the surrounding points, so the field
 * looks fine-grained without fetching more points. Missing neighbours are
 * left out of the blend; cells without a value of their own are skipped.
 */
export function buildGridFeatures(
  cells: readonly GridCell[],
  data: ReadonlyMap<string, { data: HourlySeries }>,
  options: GridOptions,
): FeatureCollection<Polygon> {
  const subdivisions = Math.max(1, Math.round(options.subdivisions ?? 1))

  // Values on the lattice, by row and column of the cell centres.
  const values = new Map<string, number>()
  const latticeKey = (row: number, col: number): string => `${row}:${col}`
  const valueOf = (cell: GridCell): number | null => {
    const series = data.get(options.keyOf(cell))?.data
    const index = series ? hourIndexAt(series.timesSec, options.instantSec) : -1
    return series && index >= 0 ? layerValue(series, options.layer, index) : null
  }
  const position = (cell: LatLon, step: number) => ({
    row: (cell.lat + MAX_LAT) / step - 0.5,
    col: (cell.lon + HALF_TURN_DEG) / step - 0.5,
  })
  for (const cell of cells) {
    const value = valueOf(cell)
    if (value !== null) {
      const { row, col } = position(cell, cell.stepDeg)
      values.set(latticeKey(Math.round(row), Math.round(col)), value)
    }
  }

  const features: Polygon[] = []
  for (const cell of cells) {
    const own = values.get(latticeKey(Math.round(position(cell, cell.stepDeg).row), Math.round(position(cell, cell.stepDeg).col)))
    if (own === undefined) {
      continue
    }
    const step = cell.stepDeg
    const half = step / 2
    if (subdivisions === 1) {
      features.push(square(cell.lon - half, cell.lat - half, cell.lon + half, cell.lat + half, own))
      continue
    }
    const columnsAround = Math.round(FULL_TURN / step)
    const sub = step / subdivisions
    for (let j = 0; j < subdivisions; j++) {
      const south = cell.lat - half + j * sub
      for (let i = 0; i < subdivisions; i++) {
        const west = cell.lon - half + i * sub
        const { row, col } = position({ lat: south + sub / 2, lon: west + sub / 2 }, step)
        const r0 = Math.floor(row)
        const c0 = Math.floor(col)
        const tr = row - r0
        const tc = col - c0
        let sum = 0
        let weight = 0
        for (const [dr, dc, w] of [[0, 0, (1 - tr) * (1 - tc)], [0, 1, (1 - tr) * tc], [1, 0, tr * (1 - tc)], [1, 1, tr * tc]] as const) {
          const wrapped = (((c0 + dc) % columnsAround) + columnsAround) % columnsAround
          const neighbour = values.get(latticeKey(r0 + dr, wrapped))
          if (neighbour !== undefined && w > 0) {
            sum += neighbour * w
            weight += w
          }
        }
        features.push(square(west, south, west + sub, south + sub, weight > 0 ? sum / weight : own))
      }
    }
  }
  return { type: 'FeatureCollection', features }
}

export interface PinFeatureProps {
  key: string
  name: string
  value: number | null
  label: string
  icon: string
  saved: boolean
  selected: boolean
}

export interface Pin {
  place: Place
  saved: boolean
  selected: boolean
}

/**
 * Saved places (always on the map, whatever the viewport) and the selected
 * city, drawn as pill labels. Pins without data show the loading placeholder.
 */
export function buildPinFeatures(
  pins: readonly Pin[],
  data: ReadonlyMap<string, { data: HourlySeries }>,
  options: SymbolOptions,
): FeatureCollection<PointFeature<PinFeatureProps>> {
  return {
    type: 'FeatureCollection',
    features: pins.map(({ place, saved, selected }) => {
      const series = data.get(place.key)?.data
      const symbol = (series ? symbolAt(series, options) : null) ?? { value: null, label: '', icon: PLACEHOLDER_IMAGE }
      return {
        type: 'Feature',
        geometry: point(place),
        properties: { key: place.key, name: place.name, saved, selected, ...symbol },
      }
    }),
  }
}
