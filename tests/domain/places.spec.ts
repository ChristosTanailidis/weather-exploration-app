import { describe, expect, it } from 'vitest'
import { cityIdOf, cityKey, isPlace, placeFromKey, placeFromPoint, sanitizePlaces } from '@/domain/places'

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

describe('city keys', () => {
  it('round-trips a city id', () => {
    expect(cityKey({ id: 264371 })).toBe('city:264371')
    expect(cityIdOf('city:264371')).toBe(264371)
  })

  it('returns null for other keys', () => {
    expect(cityIdOf('pt:1.00,2.00')).toBeNull()
    expect(cityIdOf('city:abc')).toBeNull()
  })
})

describe('placeFromPoint', () => {
  const naming = { precision: 2, maxKm: 50 }
  const kozani = { id: 735736, name: 'Kozani', countryCode: 'GR', admin1: 'West Macedonia', lat: 40.3, lon: 21.79, population: 41066 }
  const fiji = { id: 1, name: 'Dateline', countryCode: 'FJ', admin1: 'Northern', lat: -16.42, lon: 179.9, population: 1000 }

  it('names a point after the nearest city within range', () => {
    expect(placeFromPoint({ lat: 40.4011, lon: 21.9 }, [kozani], naming)).toEqual({
      key: 'pt:40.40,21.90', kind: 'point', lat: 40.4, lon: 21.9,
      name: 'Kozani', countryCode: 'GR', admin1: 'West Macedonia', nearKm: 15,
    })
  })

  it('leaves an open-sea point unnamed', () => {
    expect(placeFromPoint({ lat: 35, lon: 18 }, [kozani], naming)).toEqual({
      key: 'pt:35.00,18.00', kind: 'point', lat: 35, lon: 18, name: '',
    })
  })

  it('wraps longitudes and finds cities across the antimeridian', () => {
    const place = placeFromPoint({ lat: -16.4, lon: 180.2 }, [fiji], naming)
    expect(place.key).toBe('pt:-16.40,-179.80')
    expect(place.name).toBe('Dateline')
  })
})

describe('placeFromKey', () => {
  const naming = { precision: 2, maxKm: 50 }
  const athens = { id: 264371, name: 'Athens', countryCode: 'GR', admin1: 'Attica', lat: 37.98, lon: 23.73, population: 664046 }

  it('rebuilds dataset cities and points', () => {
    expect(placeFromKey('city:264371', [athens], naming)).toMatchObject({ kind: 'city', name: 'Athens' })
    expect(placeFromKey('pt:38.00,23.70', [athens], naming)).toMatchObject({ kind: 'point', name: 'Athens', nearKm: 3 })
  })

  it('returns null for unknown cities and malformed keys', () => {
    expect(placeFromKey('city:1', [athens], naming)).toBeNull()
    expect(placeFromKey('nope', [athens], naming)).toBeNull()
  })
})
