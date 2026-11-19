import { describe, expect, it } from 'vitest'
import {
  HOUR_SEC,
  PLACEHOLDER_IMAGE,
  WIND_ARROW_ANGLES,
  buildCityFeatures,
  buildGridFeatures,
  hourIndexAt,
  hourStartSec,
  layerValue,
  symbolAt,
  windArrowImage,
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
      value: 10, label: 'temperature:10', icon: 'wx-clear-day',
    })
    expect(symbolAt(series(), { layer: 'precipitation', instantSec: T0 + HOUR_SEC, label })?.icon).toBe('wx-partly-cloudy-night-rain')
  })

  it('uses a pre-rotated arrow pointing where the wind blows to', () => {
    expect(symbolAt(series(), { layer: 'wind', instantSec: T0, label })?.icon).toBe('wx-wind-arrow-180')
    expect(symbolAt(series(), { layer: 'wind', instantSec: T0 + HOUR_SEC, label })?.icon).toBe('wx-wind-arrow-90')
    expect(symbolAt(series(), { layer: 'wind', instantSec: T0 + 2 * HOUR_SEC, label })?.icon).toBe(PLACEHOLDER_IMAGE)
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
          loading: false,
        },
      }],
    })
  })

  it('shows placeholders for cities without data while loading', () => {
    const collection = buildCityFeatures([athens, oslo], new Map(), { layer: 'temperature', instantSec: T0, label, loading: true })
    expect(collection.features.map(f => f.properties)).toEqual([
      expect.objectContaining({ id: 264371, loading: true, icon: PLACEHOLDER_IMAGE, label: '' }),
      expect.objectContaining({ id: 3143244, loading: true, icon: PLACEHOLDER_IMAGE, label: '' }),
    ])
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

describe('windArrowImage', () => {
  it('has 16 sprites in 22.5° steps', () => {
    expect(WIND_ARROW_ANGLES).toHaveLength(16)
    expect(WIND_ARROW_ANGLES.slice(0, 4)).toEqual([0, 23, 45, 68])
    expect(WIND_ARROW_ANGLES[15]).toBe(338)
  })

  it.each([
    [0, 'wx-wind-arrow-0'],
    [11, 'wx-wind-arrow-0'],
    [12, 'wx-wind-arrow-23'],
    [350, 'wx-wind-arrow-0'],
    [337.5, 'wx-wind-arrow-338'],
    [-90, 'wx-wind-arrow-270'],
  ])('%f° → %s', (deg, name) => {
    expect(windArrowImage(deg)).toBe(name)
  })
})
