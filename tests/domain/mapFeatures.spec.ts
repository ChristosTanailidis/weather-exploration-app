import { describe, expect, it } from 'vitest'
import {
  HOUR_SEC,
  WIND_ARROW_IMAGE,
  buildCityFeatures,
  buildGridFeatures,
  hourIndexAt,
  hourStartSec,
  layerValue,
  symbolAt,
} from '@/domain/mapFeatures'
import type { SymbolOptions } from '@/domain/mapFeatures'
import type { City, HourlySeries } from '@/domain/types'

const T0 = 1_795_183_200

function series(overrides: Partial<HourlySeries> = {}): HourlySeries {
  return {
    timesSec: [T0, T0 + HOUR_SEC, T0 + 2 * HOUR_SEC],
    utcOffsetSec: 0,
    tempC: [10, 11, null],
    weatherCode: [0, 61, 3],
    precipMm: [0, 1.5, 0],
    windKmh: [5, 20, 30],
    windDirDeg: [0, 270, null],
    cloudPct: [0, 80, 100],
    isDay: [true, false, true],
    ...overrides,
  }
}

const label: SymbolOptions['label'] = (value, layer) => `${layer}:${value ?? '–'}`

describe('hourStartSec', () => {
  it('floors to the start of the hour', () => {
    expect(hourStartSec((T0 + 1799) * 1000)).toBe(T0)
    expect(hourStartSec(T0 * 1000)).toBe(T0)
  })
})

describe('hourIndexAt', () => {
  const times = [T0, T0 + HOUR_SEC, T0 + 2 * HOUR_SEC]

  it('finds exact instants', () => {
    expect(hourIndexAt(times, T0)).toBe(0)
    expect(hourIndexAt(times, T0 + 2 * HOUR_SEC)).toBe(2)
  })

  it('lines up series that start at a different hour', () => {
    expect(hourIndexAt([T0 - HOUR_SEC, T0, T0 + HOUR_SEC], T0)).toBe(1)
  })

  it('tolerates half-hour and quarter-hour local offsets', () => {
    const halfHour = times.map(t => t + HOUR_SEC / 2)
    expect(hourIndexAt(halfHour, T0 + HOUR_SEC)).toBe(1)
    expect(hourIndexAt(halfHour, T0 + HOUR_SEC - 1)).toBe(0)
    const quarter = times.map(t => t + HOUR_SEC / 4)
    expect(hourIndexAt(quarter, T0 + HOUR_SEC)).toBe(1)
  })

  it('returns -1 outside the series or for an empty series', () => {
    expect(hourIndexAt(times, T0 - 2 * HOUR_SEC)).toBe(-1)
    expect(hourIndexAt(times, T0 + 5 * HOUR_SEC)).toBe(-1)
    expect(hourIndexAt([], T0)).toBe(-1)
  })
})

describe('layerValue', () => {
  it('reads the series of each layer', () => {
    const s = series()
    expect(layerValue(s, 'temperature', 1)).toBe(11)
    expect(layerValue(s, 'precipitation', 1)).toBe(1.5)
    expect(layerValue(s, 'wind', 1)).toBe(20)
    expect(layerValue(s, 'clouds', 1)).toBe(80)
    expect(layerValue(s, 'temperature', 2)).toBeNull()
    expect(layerValue(s, 'temperature', 9)).toBeNull()
  })
})

describe('symbolAt', () => {
  it('uses the weather icon for the hour, day or night', () => {
    expect(symbolAt(series(), { layer: 'temperature', instantSec: T0, label })).toEqual({
      value: 10, label: 'temperature:10', icon: 'wx-clear-day', rotation: 0,
    })
    expect(symbolAt(series(), { layer: 'precipitation', instantSec: T0 + HOUR_SEC, label })?.icon).toBe('wx-partly-cloudy-night-rain')
  })

  it('uses a rotated arrow pointing where the wind blows to', () => {
    expect(symbolAt(series(), { layer: 'wind', instantSec: T0, label })).toMatchObject({ icon: WIND_ARROW_IMAGE, rotation: 180 })
    expect(symbolAt(series(), { layer: 'wind', instantSec: T0 + HOUR_SEC, label })?.rotation).toBe(90)
    expect(symbolAt(series(), { layer: 'wind', instantSec: T0 + 2 * HOUR_SEC, label })?.rotation).toBe(0)
  })

  it('passes missing values to the label formatter', () => {
    expect(symbolAt(series(), { layer: 'temperature', instantSec: T0 + 2 * HOUR_SEC, label })?.label).toBe('temperature:–')
  })

  it('returns null when the instant is not covered', () => {
    expect(symbolAt(series(), { layer: 'temperature', instantSec: T0 + 10 * HOUR_SEC, label })).toBeNull()
  })
})

describe('buildCityFeatures', () => {
  const athens: City = { id: 264371, name: 'Athens', countryCode: 'GR', admin1: 'Attica', lat: 37.98, lon: 23.73, population: 664046 }
  const oslo: City = { id: 3143244, name: 'Oslo', countryCode: 'NO', admin1: 'Oslo', lat: 59.91, lon: 10.75, population: 580000 }

  it('builds point features for cities with data', () => {
    const data = new Map([['city:264371', { data: series() }]])
    const collection = buildCityFeatures([athens, oslo], data, { layer: 'temperature', instantSec: T0, label })
    expect(collection).toEqual({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        id: 264371,
        geometry: { type: 'Point', coordinates: [23.73, 37.98] },
        properties: {
          id: 264371,
          name: 'Athens',
          population: 664046,
          value: 10,
          label: 'temperature:10',
          icon: 'wx-clear-day',
          rotation: 0,
        },
      }],
    })
  })

  it('leaves out cities whose data does not cover the instant', () => {
    const data = new Map([['city:264371', { data: series() }]])
    expect(buildCityFeatures([athens], data, { layer: 'temperature', instantSec: T0 - 5 * HOUR_SEC, label }).features).toEqual([])
  })
})

describe('buildGridFeatures', () => {
  const keyOf = (cell: { lat: number, lon: number }) => `pt:${cell.lat},${cell.lon}`

  it('builds a closed square per cell with the layer value', () => {
    const cell = { lat: 7.5, lon: 22.5, stepDeg: 15 }
    const data = new Map([[keyOf(cell), { data: series() }]])
    expect(buildGridFeatures([cell], data, { layer: 'clouds', instantSec: T0 + HOUR_SEC, keyOf })).toEqual({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[[15, 0], [30, 0], [30, 15], [15, 15], [15, 0]]] },
        properties: { value: 80 },
      }],
    })
  })

  it('clamps cells at the poles', () => {
    const cell = { lat: 85, lon: 0, stepDeg: 15 }
    const data = new Map([[keyOf(cell), { data: series() }]])
    const ring = buildGridFeatures([cell], data, { layer: 'temperature', instantSec: T0, keyOf }).features[0]?.geometry.coordinates[0]
    expect(Math.max(...(ring ?? []).map(([, lat]) => lat))).toBe(90)
  })

  it('leaves out cells without data or without a value', () => {
    const withNull = { lat: 1, lon: 1, stepDeg: 1 }
    const without = { lat: 2, lon: 2, stepDeg: 1 }
    const data = new Map([[keyOf(withNull), { data: series() }]])
    const result = buildGridFeatures([withNull, without], data, { layer: 'temperature', instantSec: T0 + 2 * HOUR_SEC, keyOf })
    expect(result.features).toEqual([])
  })
})
