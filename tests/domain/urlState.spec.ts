import { describe, expect, it } from 'vitest'
import { parsePlaceKey, parseUrlState, parseView, serializeUrlState } from '@/domain/urlState'
import type { UrlState } from '@/domain/urlState'

describe('round trip', () => {
  it.each<UrlState>([
    {},
    { view: { lat: 40.64, lon: 22.94, zoom: 5.25 } },
    { view: { lat: -33.869, lon: 151.209, zoom: 0 }, place: 'city:2147714', layer: 'wind', t: 47 },
    { place: 'pt:-12.50,-77.03', layer: 'precipitation', t: 0 },
    { layer: 'clouds' },
  ])('parse(serialize(%o)) keeps the state', (state) => {
    expect(parseUrlState(serializeUrlState(state))).toEqual(state)
  })

  it('serialize(parse(query)) keeps a canonical query', () => {
    const query = { v: '40.64,22.94,5.25', place: 'city:734077', layer: 'temperature', t: '12' }
    expect(serializeUrlState(parseUrlState(query))).toEqual(query)
  })

  it('rounds the view for shorter URLs', () => {
    expect(serializeUrlState({ view: { lat: 40.640728, lon: 22.934932, zoom: 5.123 } }).v).toBe('40.641,22.935,5.12')
  })
})

describe('invalid params are ignored', () => {
  it.each([
    ['v', 'abc'],
    ['v', '1,2'],
    ['v', '1,2,3,4'],
    ['v', '91,0,2'],
    ['v', '10,20,-1'],
    ['v', '10,20,30'],
    ['v', ',,'],
    ['v', '1e3,2,3'],
    ['place', 'city:abc'],
    ['place', 'pt:95,10'],
    ['place', 'pt:10'],
    ['place', 'javascript:alert(1)'],
    ['layer', 'pressure'],
    ['layer', ''],
    ['t', '-1'],
    ['t', '48'],
    ['t', '1.5'],
    ['t', 'now'],
  ])('%s=%s', (key, value) => {
    expect(parseUrlState({ [key]: value })).toEqual({})
  })

  it('keeps valid params next to invalid ones', () => {
    expect(parseUrlState({ v: 'nope', layer: 'wind', t: '99', place: 'city:1' })).toEqual({ layer: 'wind', place: 'city:1' })
  })

  it('ignores unrelated params and null values', () => {
    expect(parseUrlState({ debug: '1', layer: null, t: undefined })).toEqual({})
  })
})

describe('parsing details', () => {
  it('uses the first value of repeated params', () => {
    expect(parseUrlState({ layer: [null, 'clouds', 'wind'] })).toEqual({ layer: 'clouds' })
  })

  it('wraps longitudes into [-180, 180)', () => {
    expect(parseView('10,190,2')).toEqual({ lat: 10, lon: -170, zoom: 2 })
  })

  it('canonicalises point keys', () => {
    expect(parsePlaceKey('pt:40.6401,22.9')).toBe('pt:40.64,22.90')
    expect(parsePlaceKey('pt:-0.001,180')).toBe('pt:0.00,-180.00')
  })

  it('respects a custom number of hours', () => {
    expect(parseUrlState({ t: '30' }, 24)).toEqual({})
    expect(parseUrlState({ t: '23' }, 24)).toEqual({ t: 23 })
  })
})
