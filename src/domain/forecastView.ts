import { hourIndexAt, hourStartSec } from '@/domain/mapFeatures'
import type { DailyForecast, Forecast } from '@/domain/types'

/*
 * Pure shaping of a place forecast for the panel: the next 24 hours from
 * now, the 7-day rows on one weekly scale, and wind direction names.
 */

const PERCENT = 100
const SEC_PER_DAY = 86_400

export interface PanelHour {
  timeSec: number
  /** Seconds since local midnight (from the place's UTC offset). */
  localSec: number
  tempC: number | null
  precipProbPct: number | null
  weatherCode: number | null
  isDay: boolean
}

/** The next `hours` hourly slots starting at the current hour (fewer if the forecast ends). */
export function nextHours(forecast: Forecast, nowMs: number, hours: number): PanelHour[] {
  const { hourly, utcOffsetSec } = forecast
  const start = hourIndexAt(hourly.timesSec, hourStartSec(nowMs))
  if (start < 0) {
    return []
  }
  return hourly.timesSec.slice(start, start + hours).map((timeSec, offset) => {
    const i = start + offset
    return {
      timeSec,
      localSec: (((timeSec + utcOffsetSec) % SEC_PER_DAY) + SEC_PER_DAY) % SEC_PER_DAY,
      tempC: hourly.tempC[i] ?? null,
      precipProbPct: hourly.precipProbPct[i] ?? null,
      weatherCode: hourly.weatherCode[i] ?? null,
      isDay: hourly.isDay[i] ?? true,
    }
  })
}

/** Indices where a new local day starts (local midnight). */
export function midnightIndices(hours: readonly PanelHour[]): number[] {
  return hours.flatMap((hour, i) => (i > 0 && hour.localSec === 0 ? [i] : []))
}

/** Runs of consecutive night hours as [start, end] index pairs (inclusive). */
export function nightSpans(hours: readonly PanelHour[]): [number, number][] {
  const spans: [number, number][] = []
  hours.forEach((hour, i) => {
    const last = spans[spans.length - 1]
    if (hour.isDay) {
      return
    }
    if (last && last[1] === i - 1) {
      last[1] = i
    }
    else {
      spans.push([i, i])
    }
  })
  return spans
}

export interface DayRow {
  /** Unix seconds of local midnight. */
  timeSec: number
  weatherCode: number | null
  precipProbMaxPct: number | null
  tempMinC: number | null
  tempMaxC: number | null
  /** Bar position on the shared weekly scale, 0–100. */
  barLeftPct: number
  barWidthPct: number
  /** Position of the current temperature within today's bar, 0–100; only on the first day. */
  nowPct: number | null
}

/** Daily rows whose min–max bars share one scale across the week. */
export function weeklyRows(daily: DailyForecast, currentTempC: number | null): DayRow[] {
  const mins = daily.tempMinC.filter((v): v is number => v !== null)
  const maxs = daily.tempMaxC.filter((v): v is number => v !== null)
  const low = Math.min(...mins, ...(currentTempC === null ? [] : [currentTempC]))
  const high = Math.max(...maxs, ...(currentTempC === null ? [] : [currentTempC]))
  const span = high - low || 1
  return daily.timesSec.map((timeSec, i) => {
    const min = daily.tempMinC[i] ?? null
    const max = daily.tempMaxC[i] ?? null
    const valid = min !== null && max !== null
    const nowInBar = i === 0 && valid && currentTempC !== null
      ? Math.min(PERCENT, Math.max(0, ((currentTempC - min) / ((max - min) || 1)) * PERCENT))
      : null
    return {
      timeSec,
      weatherCode: daily.weatherCode[i] ?? null,
      precipProbMaxPct: daily.precipProbMaxPct[i] ?? null,
      tempMinC: min,
      tempMaxC: max,
      barLeftPct: valid ? ((min - low) / span) * PERCENT : 0,
      barWidthPct: valid ? ((max - min) / span) * PERCENT : 0,
      nowPct: nowInBar,
    }
  })
}

const COMPASS = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const
export type CompassPoint = (typeof COMPASS)[number]

/** 8-point compass name for a direction in degrees. */
export function compassPoint(deg: number): CompassPoint {
  const STEP = 45
  return COMPASS[((Math.round(deg / STEP) % COMPASS.length) + COMPASS.length) % COMPASS.length] ?? 'n'
}

/** Local wall-clock time for an instant at a UTC offset, as a Date to format in UTC. */
export function localClock(timeSec: number, utcOffsetSec: number): Date {
  return new Date((timeSec + utcOffsetSec) * 1000)
}
