import { describe, expect, it } from 'vitest'
import { compassPoint, localClock, midnightIndices, nextHours, nightSpans, weeklyRows } from '@/domain/forecastView'
import type { DailyForecast, Forecast } from '@/domain/types'

const HOUR = 3600
const MIDNIGHT_UTC = Date.UTC(2026, 10, 20) / 1000
const OFFSET = 2 * HOUR // Athens in winter

function forecast(): Forecast {
  const start = MIDNIGHT_UTC - OFFSET // local midnight
  const timesSec = Array.from({ length: 72 }, (_, i) => start + i * HOUR)
  return {
    lat: 0, lon: 0, timezone: 'Europe/Athens', utcOffsetSec: OFFSET,
    current: { timeSec: 0, tempC: 12, apparentTempC: 10, humidityPct: 70, weatherCode: 2, isDay: true, precipMm: 0, windKmh: 10, windDirDeg: 180 },
    hourly: {
      timesSec,
      tempC: timesSec.map((_, i) => i),
      precipProbPct: timesSec.map(() => 10),
      weatherCode: timesSec.map(() => 0),
      isDay: timesSec.map((_, i) => (i % 24) >= 7 && (i % 24) < 17),
    },
    daily: { timesSec: [], weatherCode: [], tempMaxC: [], tempMinC: [], precipProbMaxPct: [], sunriseSec: [], sunsetSec: [] },
  }
}

describe('nextHours', () => {
  it('starts at the current hour and keeps local time of day', () => {
    const now = (MIDNIGHT_UTC - OFFSET + 14 * HOUR + 1200) * 1000 // 14:20 local
    const hours = nextHours(forecast(), now, 24)
    expect(hours).toHaveLength(24)
    expect(hours[0]?.tempC).toBe(14)
    expect(hours[0]?.localSec).toBe(14 * HOUR)
    expect(midnightIndices(hours)).toEqual([10])
  })

  it('returns fewer hours at the end of the forecast and none outside it', () => {
    const f = forecast()
    expect(nextHours(f, (MIDNIGHT_UTC - OFFSET + 60 * HOUR) * 1000, 24)).toHaveLength(12)
    expect(nextHours(f, (MIDNIGHT_UTC + 100 * HOUR) * 1000, 24)).toEqual([])
  })
})

describe('nightSpans', () => {
  it('groups consecutive night hours', () => {
    const now = (MIDNIGHT_UTC - OFFSET + 14 * HOUR) * 1000
    expect(nightSpans(nextHours(forecast(), now, 24))).toEqual([[3, 16]])
  })
})

describe('weeklyRows', () => {
  const daily: DailyForecast = {
    timesSec: [1, 2, 3],
    weatherCode: [61, 3, null],
    tempMinC: [6, 4, null],
    tempMaxC: [13, 12, null],
    precipProbMaxPct: [60, 30, null],
    sunriseSec: [null, null, null],
    sunsetSec: [null, null, null],
  }

  it('places every bar on one weekly scale', () => {
    const rows = weeklyRows(daily, 12)
    // scale 4–13
    expect(rows[0]?.barLeftPct).toBeCloseTo((2 / 9) * 100, 6)
    expect(rows[0]?.barWidthPct).toBeCloseTo((7 / 9) * 100, 6)
    expect(rows[1]?.barLeftPct).toBe(0)
    expect(rows[1]?.barWidthPct).toBeCloseTo((8 / 9) * 100, 6)
  })

  it('marks the current temperature on today only', () => {
    const rows = weeklyRows(daily, 12)
    expect(rows[0]?.nowPct).toBeCloseTo((6 / 7) * 100, 6)
    expect(rows[1]?.nowPct).toBeNull()
  })

  it('handles missing values and a missing current temperature', () => {
    const rows = weeklyRows(daily, null)
    expect(rows[2]).toMatchObject({ barLeftPct: 0, barWidthPct: 0, nowPct: null, tempMinC: null })
    expect(rows[0]?.nowPct).toBeNull()
  })
})

describe('compassPoint', () => {
  it.each([[0, 'n'], [44, 'ne'], [180, 's'], [337.6, 'n'], [-90, 'w'], [359, 'n']])('%f° → %s', (deg, point) => {
    expect(compassPoint(deg)).toBe(point)
  })
})

describe('localClock', () => {
  it('shifts an instant to the place wall clock', () => {
    expect(localClock(MIDNIGHT_UTC, OFFSET).getUTCHours()).toBe(2)
  })
})
