import { describe, expect, it } from 'vitest'
import { isNight, nightRanges, solarElevationDeg } from '@/domain/sun'

const at = (iso: string) => Date.parse(iso) / 1000
const athens = { lat: 37.98, lon: 23.73 }

describe('solarElevationDeg', () => {
  it('is high around midsummer noon in Athens', () => {
    const elevation = solarElevationDeg(athens, at('2026-06-21T10:30:00Z'))
    expect(elevation).toBeGreaterThan(73)
    expect(elevation).toBeLessThan(77)
  })

  it('is near the zenith at the equator at an equinox noon', () => {
    expect(solarElevationDeg({ lat: 0, lon: 0 }, at('2026-03-20T12:07:00Z'))).toBeGreaterThan(88)
  })

  it('is negative at midnight', () => {
    expect(solarElevationDeg(athens, at('2026-11-20T22:00:00Z'))).toBeLessThan(-30)
  })
})

describe('isNight', () => {
  it('knows Athens in November is dark at 17:00 UTC and light at 08:00 UTC', () => {
    expect(isNight(athens, at('2026-11-20T17:00:00Z'))).toBe(true)
    expect(isNight(athens, at('2026-11-20T08:00:00Z'))).toBe(false)
  })

  it('handles polar night', () => {
    expect(isNight({ lat: 80, lon: 15 }, at('2026-12-21T12:00:00Z'))).toBe(true)
  })
})

describe('nightRanges', () => {
  it('groups consecutive night hours', () => {
    const ranges = nightRanges(athens, at('2026-11-20T12:00:00Z'), 48)
    expect(ranges).toHaveLength(2)
    // Sunset about 15:10 UTC, sunrise about 05:20 UTC.
    expect(ranges[0]).toEqual({ start: 4, end: 18 })
    expect(ranges[1]?.start).toBe(28)
  })

  it('closes a range that runs to the end of the window', () => {
    expect(nightRanges({ lat: 80, lon: 15 }, at('2026-12-21T00:00:00Z'), 24)).toEqual([{ start: 0, end: 24 }])
  })
})
