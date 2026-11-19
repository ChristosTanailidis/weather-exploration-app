import { cityKey } from '@/domain/places'
import type { City, HourlySeries, LayerId, LatLon } from '@/domain/types'
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
export const WIND_ARROW_IMAGE = `${MAP_IMAGE_PREFIX}arrow`

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
  icon: string
  /** Icon rotation in degrees (wind arrows point where the wind blows to). */
  rotation: number
  population: number
}

export interface SymbolOptions {
  layer: LayerId
  instantSec: number
  /** Formats a layer value for display; receives `null` for missing values. */
  label: (value: number | null, layer: LayerId) => string
}

interface Symbol {
  value: number | null
  label: string
  icon: string
  rotation: number
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
    return {
      value,
      label,
      icon: WIND_ARROW_IMAGE,
      rotation: fromDeg == null ? 0 : (fromDeg + HALF_TURN_DEG) % FULL_TURN_DEG,
    }
  }
  const weather = describeWeather(series.weatherCode[index], series.isDay[index] ?? true)
  return { value, label, icon: `${MAP_IMAGE_PREFIX}${weather.icon}`, rotation: 0 }
}

const point = (place: LatLon): PointFeature<never>['geometry'] => ({ type: 'Point', coordinates: [place.lon, place.lat] })

/** City symbols for the map; cities without data at the instant are left out. */
export function buildCityFeatures(
  cities: readonly City[],
  data: ReadonlyMap<string, { data: HourlySeries }>,
  options: SymbolOptions,
): FeatureCollection<PointFeature<CityFeatureProps>> {
  const features: PointFeature<CityFeatureProps>[] = []
  for (const city of cities) {
    const series = data.get(cityKey(city))?.data
    const symbol = series && symbolAt(series, options)
    if (!symbol) {
      continue
    }
    features.push({
      type: 'Feature',
      id: city.id,
      geometry: point(city),
      properties: { id: city.id, name: city.name, population: city.population, ...symbol },
    })
  }
  return { type: 'FeatureCollection', features }
}
