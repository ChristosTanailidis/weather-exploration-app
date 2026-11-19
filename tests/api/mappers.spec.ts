import { describe, expect, it } from 'vitest'
import { toForecast, toHourlySeries, toSearchResults } from '@/api/mappers'
import type { RawForecastResponse, RawGeocodingResponse, RawOverviewResponse } from '@/api/openMeteo'
import overviewFixture from './fixtures/overview.json'
import forecastFixture from './fixtures/forecast.json'
import searchFixture from './fixtures/search.json'

const overview = overviewFixture as unknown as RawOverviewResponse[]
const forecast = forecastFixture as unknown as RawForecastResponse
const search = searchFixture as unknown as RawGeocodingResponse

describe('toHourlySeries', () => {
  it('maps an overview location', () => {
    const berlin = overview[0]
    if (!berlin) throw new Error('fixture missing')
    expect(toHourlySeries(berlin)).toEqual({
      timesSec: [1795183200, 1795186800, 1795190400],
      utcOffsetSec: 3600,
      tempC: [4.1, 3.8, null],
      weatherCode: [3, 61, 61],
      precipMm: [0, 0.4, 1.2],
      windKmh: [14.4, 15.1, 16.9],
      windDirDeg: [250, 255, 260],
      cloudPct: [100, 100, 98],
      isDay: [false, false, true],
    })
  })

  it('aligns every location on the same instants', () => {
    const [a, b] = overview.map(toHourlySeries)
    expect(a?.timesSec).toEqual(b?.timesSec)
  })

  it('aligns short or missing series to the time axis', () => {
    const raw = {
      latitude: 0,
      longitude: 0,
      utc_offset_seconds: 0,
      timezone: 'GMT',
      hourly: { time: [1, 2], temperature_2m: [5] },
    } as unknown as RawOverviewResponse
    const mapped = toHourlySeries(raw)
    expect(mapped.tempC).toEqual([5, null])
    expect(mapped.cloudPct).toEqual([null, null])
    expect(mapped.isDay).toEqual([false, false])
  })

  it('survives a response without hourly data', () => {
    const raw = { latitude: 0, longitude: 0 } as unknown as RawOverviewResponse
    expect(toHourlySeries(raw)).toMatchObject({ timesSec: [], tempC: [], utcOffsetSec: 0 })
  })
})

describe('toForecast', () => {
  it('maps current, hourly and daily data', () => {
    const mapped = toForecast(forecast)
    expect(mapped.timezone).toBe('Europe/Athens')
    expect(mapped.utcOffsetSec).toBe(7200)
    expect(mapped.current).toEqual({
      timeSec: 1795184100,
      tempC: 12.4,
      apparentTempC: 10.9,
      humidityPct: 71,
      weatherCode: 2,
      isDay: true,
      precipMm: 0,
      windKmh: 5.4,
      windDirDeg: 18,
    })
    expect(mapped.hourly.precipProbPct).toEqual([0, 5, null])
    expect(mapped.hourly.isDay).toEqual([false, false, false])
    expect(mapped.daily).toEqual({
      timesSec: [1795125600, 1795212000],
      weatherCode: [3, 61],
      tempMaxC: [15.2, 13.1],
      tempMinC: [7.4, 8],
      precipProbMaxPct: [10, 80],
      sunriseSec: [1795152313, 1795238780],
      sunsetSec: [1795187642, 1795274018],
    })
  })

  it('maps missing current values to null', () => {
    const raw = { ...forecast, current: { time: 1 } } as unknown as RawForecastResponse
    expect(toForecast(raw).current).toMatchObject({ tempC: null, weatherCode: null, isDay: false })
  })
})

describe('toSearchResults', () => {
  it('maps geocoding results', () => {
    expect(toSearchResults(search)).toEqual([
      { id: 734077, name: 'Thessaloniki', lat: 40.64072, lon: 22.93493, countryCode: 'GR', country: 'Greece', admin1: 'Central Macedonia' },
      { id: 6164831, name: 'Thessalon', lat: 46.25006, lon: -83.5666, countryCode: 'CA', country: 'Canada', admin1: 'Ontario' },
    ])
  })

  it('returns an empty list when nothing matched', () => {
    expect(toSearchResults({ })).toEqual([])
  })

  it('drops results without coordinates and fills missing optional fields', () => {
    const raw = {
      results: [
        { id: 1, name: 'Nowhere', latitude: null, longitude: 3 },
        { id: 2, name: 'Bare', latitude: 1, longitude: 2 },
      ],
    } as unknown as RawGeocodingResponse
    expect(toSearchResults(raw)).toEqual([
      { id: 2, name: 'Bare', lat: 1, lon: 2, countryCode: '', country: '', admin1: '' },
    ])
  })
})
