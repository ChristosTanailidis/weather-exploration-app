import { describe, expect, it } from 'vitest'
import { alignSeries, boundsOf, sharedRangeBars, summarize } from '@/domain/collection'
import type { HourlySeries } from '@/domain/types'

const HOUR = 3600
const T0 = 1_795_183_200

function series(temps: (number | null)[]): HourlySeries {
  return {
    timesSec: temps.map((_, i) => T0 + i * HOUR),
    utcOffsetSec: 0,
    tempC: temps,
    weatherCode: temps.map(() => 61),
    precipMm: temps.map(() => 0),
    windKmh: temps.map(() => 0),
    windDirDeg: temps.map(() => 0),
    cloudPct: temps.map(() => 0),
    isDay: temps.map(() => false),
  }
}

describe('summarize', () => {
  it('reads conditions now and the range over the next hours', () => {
    expect(summarize(series([5, 9, 3, 12, 20]), T0 + HOUR, 3)).toEqual({
      icon: 'partly-cloudy-night-rain',
      labelKey: 'weather.rainSlight',
      tempC: 9,
      minC: 3,
      maxC: 12,
    })
  })

  it('ignores missing values and handles an all-missing window', () => {
    expect(summarize(series([null, 4, null]), T0, 3)).toMatchObject({ tempC: null, minC: 4, maxC: 4 })
    expect(summarize(series([null, null]), T0, 2)).toMatchObject({ minC: null, maxC: null })
  })

  it('returns null when the instant is not covered', () => {
    expect(summarize(series([1, 2]), T0 + 10 * HOUR, 24)).toBeNull()
  })
})

describe('boundsOf', () => {
  it('wraps all points', () => {
    expect(boundsOf([{ lat: 40, lon: 22 }, { lat: 51.5, lon: -0.1 }, { lat: 30, lon: 31 }])).toEqual({
      west: -0.1, south: 30, east: 31, north: 51.5,
    })
  })

  it('returns null without points', () => {
    expect(boundsOf([])).toBeNull()
  })
})

describe('alignSeries', () => {
  it('reads each instant by time, so series starting at different hours line up', () => {
    const early = series([1, 2, 3, 4])
    const late = { ...series([20, 30, 40]), timesSec: [T0 + HOUR, T0 + 2 * HOUR, T0 + 3 * HOUR] }
    const pick = (s: HourlySeries, i: number) => s.tempC[i] ?? null
    expect(alignSeries(early, T0 + HOUR, 3, pick)).toEqual([2, 3, 4])
    expect(alignSeries(late, T0 + HOUR, 3, pick)).toEqual([20, 30, 40])
    expect(alignSeries(late, T0, 2, pick)).toEqual([null, 20])
    expect(alignSeries(undefined, T0, 2, pick)).toEqual([null, null])
  })
})

describe('sharedRangeBars', () => {
  it('puts every range on one scale with the current value marked', () => {
    const bars = sharedRangeBars([
      { min: 6, max: 13, now: 12 },
      { min: -8, max: -4, now: -5 },
      { min: null, max: null, now: null },
    ])
    // scale −8 … 13 (21 degrees)
    expect(bars[0]?.leftPct).toBeCloseTo((14 / 21) * 100, 6)
    expect(bars[0]?.widthPct).toBeCloseTo((7 / 21) * 100, 6)
    expect(bars[0]?.nowPct).toBeCloseTo((6 / 7) * 100, 6)
    expect(bars[1]?.leftPct).toBe(0)
    expect(bars[1]?.nowPct).toBe(75)
    expect(bars[2]).toEqual({ leftPct: 0, widthPct: 0, nowPct: null })
  })
})
