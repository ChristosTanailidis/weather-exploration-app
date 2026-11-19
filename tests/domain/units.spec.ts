import { describe, expect, it } from 'vitest'
import {
  UNIT_SETS,
  celsiusToFahrenheit,
  defaultUnitSystem,
  displayPrecip,
  displaySpeed,
  displayTemp,
  kmhToMph,
  mmToInches,
  roundTo,
} from '@/domain/units'
import en from '@/locales/en.json'

describe('conversions', () => {
  it.each([
    [0, 32],
    [100, 212],
    [-40, -40],
    [37, 98.6],
  ])('%f °C is %f °F', (c, f) => {
    expect(celsiusToFahrenheit(c)).toBeCloseTo(f, 6)
  })

  it('converts km/h to mph', () => {
    expect(kmhToMph(1.609344)).toBeCloseTo(1, 9)
    expect(kmhToMph(100)).toBeCloseTo(62.137, 3)
  })

  it('converts mm to inches', () => {
    expect(mmToInches(25.4)).toBeCloseTo(1, 9)
    expect(mmToInches(0)).toBe(0)
  })
})

describe('roundTo', () => {
  it('rounds to the given decimals', () => {
    expect(roundTo(1.26, 1)).toBe(1.3)
    expect(roundTo(12.5, 0)).toBe(13)
  })

  it('never returns negative zero', () => {
    expect(Object.is(roundTo(-0.4, 0), 0)).toBe(true)
    expect(Object.is(roundTo(-0, 2), 0)).toBe(true)
  })
})

describe('display values', () => {
  it('keeps metric values and rounds them', () => {
    expect(displayTemp(21.6, 'metric')).toBe(22)
    expect(displaySpeed(14.4, 'metric')).toBe(14)
    expect(displayPrecip(0.26, 'metric')).toBe(0.3)
  })

  it('converts to imperial and rounds', () => {
    expect(displayTemp(21.6, 'imperial')).toBe(71)
    expect(displaySpeed(100, 'imperial')).toBe(62)
    expect(displayPrecip(10, 'imperial')).toBe(0.39)
  })

  it('shows freezing-adjacent values without a minus sign', () => {
    expect(Object.is(displayTemp(-0.3, 'metric'), 0)).toBe(true)
  })

  it.each([null, undefined, Number.NaN, Number.POSITIVE_INFINITY])('returns null for %s', (value) => {
    expect(displayTemp(value, 'metric')).toBeNull()
    expect(displaySpeed(value, 'imperial')).toBeNull()
    expect(displayPrecip(value, 'metric')).toBeNull()
  })
})

describe('unit sets', () => {
  it('has a translated format for every unit', () => {
    const units = en.units as Record<string, string>
    for (const set of Object.values(UNIT_SETS)) {
      for (const unit of Object.values(set)) {
        expect(units[unit]).toContain('{value}')
      }
    }
  })
})

describe('defaultUnitSystem', () => {
  it.each([
    ['en-US', 'imperial'],
    ['en_us', 'imperial'],
    ['en-GB', 'metric'],
    ['el-GR', 'metric'],
    ['en', 'metric'],
    [undefined, 'metric'],
  ])('%s → %s', (locale, expected) => {
    expect(defaultUnitSystem(locale)).toBe(expected)
  })
})
