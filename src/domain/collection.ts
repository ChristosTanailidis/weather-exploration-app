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

/** Values of each series at `hours` hourly instants from `startSec`; `null` where not covered. */
export function alignSeries(series: HourlySeries | undefined, startSec: number, hours: number, pick: (s: HourlySeries, i: number) => number | null): (number | null)[] {
  const HOUR_SEC = 3600
  return Array.from({ length: hours }, (_, h) => {
    if (!series) {
      return null
    }
    const i = hourIndexAt(series.timesSec, startSec + h * HOUR_SEC)
    return i < 0 ? null : pick(series, i)
  })
}

export interface RangeBar {
  leftPct: number
  widthPct: number
  /** Position of the current value inside the bar, 0–100. */
  nowPct: number | null
}

/** Low–high bars for several places on one shared scale. */
export function sharedRangeBars(ranges: readonly { min: number | null, max: number | null, now: number | null }[]): RangeBar[] {
  const PERCENT = 100
  const values = ranges.flatMap(r => [r.min, r.max]).filter((v): v is number => v !== null)
  const low = Math.min(...values)
  const span = Math.max(...values) - low || 1
  return ranges.map(({ min, max, now }) => {
    if (min === null || max === null) {
      return { leftPct: 0, widthPct: 0, nowPct: null }
    }
    const nowPct = now === null ? null : Math.min(PERCENT, Math.max(0, ((now - min) / ((max - min) || 1)) * PERCENT))
    return { leftPct: ((min - low) / span) * PERCENT, widthPct: ((max - min) / span) * PERCENT, nowPct }
  })
}
