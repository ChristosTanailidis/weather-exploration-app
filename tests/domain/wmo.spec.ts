import { describe, expect, it } from 'vitest'
import { UNKNOWN_WEATHER, WEATHER_ICONS, WMO_CODES, describeWeather } from '@/domain/wmo'
import en from '@/locales/en.json'

const DOCUMENTED_CODES = [
  0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99,
]

function messageExists(key: string): boolean {
  const value = key.split('.').reduce<unknown>(
    (node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined),
    en,
  )
  return typeof value === 'string'
}

describe('describeWeather', () => {
  it('covers every code Open-Meteo documents', () => {
    expect([...WMO_CODES].sort((a, b) => a - b)).toEqual(DOCUMENTED_CODES)
  })

  it.each(DOCUMENTED_CODES)('maps code %i to an existing label and icon', (code) => {
    const day = describeWeather(code, true)
    const night = describeWeather(code, false)
    expect(messageExists(day.labelKey)).toBe(true)
    expect(day.labelKey).toBe(night.labelKey)
    expect(day.icon).not.toBe('not-available')
    expect(WEATHER_ICONS).toContain(day.icon)
    expect(WEATHER_ICONS).toContain(night.icon)
  })

  it('uses day and night icons where they differ', () => {
    expect(describeWeather(0, true).icon).toBe('clear-day')
    expect(describeWeather(0, false).icon).toBe('clear-night')
    expect(describeWeather(2, false).icon).toBe('partly-cloudy-night')
    expect(describeWeather(3, false).icon).toBe('overcast')
  })

  it('defaults to the day variant', () => {
    expect(describeWeather(0)).toEqual(describeWeather(0, true))
  })

  it.each([4, -1, 100, 1.5, Number.NaN, null, undefined])('falls back safely for %s', (code) => {
    expect(describeWeather(code)).toEqual(UNKNOWN_WEATHER)
  })

  it('has a translated fallback label', () => {
    expect(messageExists(UNKNOWN_WEATHER.labelKey)).toBe(true)
  })

  it('lists each icon once', () => {
    expect(new Set(WEATHER_ICONS).size).toBe(WEATHER_ICONS.length)
    expect(WEATHER_ICONS).toContain('not-available')
  })
})
