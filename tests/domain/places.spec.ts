import { describe, expect, it } from 'vitest'
import { isPlace, sanitizePlaces } from '@/domain/places'

const athens = { key: 'city:264371', kind: 'city', name: 'Athens', lat: 37.98, lon: 23.73, countryCode: 'GR' }

describe('isPlace', () => {
  it('accepts a valid place', () => {
    expect(isPlace(athens)).toBe(true)
  })

  it.each([
    null,
    'Athens',
    { ...athens, key: '' },
    { ...athens, kind: 'planet' },
    { ...athens, lat: 100 },
    { ...athens, lon: Number.NaN },
    { ...athens, name: 42 },
    { ...athens, countryCode: 3 },
  ])('rejects %o', (value) => {
    expect(isPlace(value)).toBe(false)
  })
})

describe('sanitizePlaces', () => {
  it('keeps valid places once, in order', () => {
    const other = { ...athens, key: 'pt:1.00,2.00', kind: 'point', name: '1, 2' }
    expect(sanitizePlaces([athens, { bad: true }, other, athens])).toEqual([athens, other])
  })

  it('returns an empty list for non-arrays', () => {
    expect(sanitizePlaces({})).toEqual([])
    expect(sanitizePlaces(null)).toEqual([])
  })
})
