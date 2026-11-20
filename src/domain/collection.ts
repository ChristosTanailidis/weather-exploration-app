import type { Bounds } from '@/domain/geo'
import { hourIndexAt } from '@/domain/mapFeatures'
import type { HourlySeries, LatLon } from '@/domain/types'
import { describeWeather } from '@/domain/wmo'
import type { WeatherIcon } from '@/domain/wmo'

/** What a My places row shows, from the overview series (no extra request). */
export interface PlaceSummary {
  icon: WeatherIcon
  labelKey: string
  tempC: number | null
  /** Low and high over the next `hours` hours. */
  minC: number | null
  maxC: number | null
}

/** Conditions at `instantSec` and the range over the following hours. */
export function summarize(series: HourlySeries, instantSec: number, hours: number): PlaceSummary | null {
  const start = hourIndexAt(series.timesSec, instantSec)
  if (start < 0) {
    return null
  }
  const window = series.tempC.slice(start, start + hours).filter((v): v is number => v !== null)
  const weather = describeWeather(series.weatherCode[start], series.isDay[start] ?? true)
  return {
    icon: weather.icon,
    labelKey: weather.labelKey,
    tempC: series.tempC[start] ?? null,
    minC: window.length > 0 ? Math.min(...window) : null,
    maxC: window.length > 0 ? Math.max(...window) : null,
  }
}

/** Bounds around all points (for "My world"), or `null` without points. */
export function boundsOf(points: readonly LatLon[]): Bounds | null {
  if (points.length === 0) {
    return null
  }
  const lats = points.map(p => p.lat)
  const lons = points.map(p => p.lon)
  return { west: Math.min(...lons), south: Math.min(...lats), east: Math.max(...lons), north: Math.max(...lats) }
}
