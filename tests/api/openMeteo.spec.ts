import { describe, expect, it, vi } from 'vitest'
import {
  HttpError,
  buildForecastUrl,
  buildOverviewUrl,
  buildSearchUrl,
  fetchForecast,
  fetchOverview,
  fetchSearch,
} from '@/api/openMeteo'
import overviewFixture from './fixtures/overview.json'
import forecastFixture from './fixtures/forecast.json'
import searchFixture from './fixtures/search.json'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

const berlin = { lat: 52.52, lon: 13.41 }
const paris = { lat: 48.85, lon: 2.35 }

describe('request URLs', () => {
  it('builds the batched overview URL', () => {
    expect(buildOverviewUrl([berlin, paris])).toBe(
      'https://api.open-meteo.com/v1/forecast'
      + '?latitude=52.52,48.85&longitude=13.41,2.35'
      + '&hourly=temperature_2m,weather_code,precipitation,wind_speed_10m,wind_direction_10m,cloud_cover,is_day'
      + '&forecast_hours=48&timeformat=unixtime&timezone=auto',
    )
  })

  it('rounds and wraps coordinates', () => {
    expect(buildOverviewUrl([{ lat: 40.64072, lon: 202.93493 }])).toContain('latitude=40.64&longitude=-157.07&')
  })

  it('builds the place details URL', () => {
    expect(buildForecastUrl({ lat: 40.64, lon: 22.94 })).toBe(
      'https://api.open-meteo.com/v1/forecast'
      + '?latitude=40.64&longitude=22.94'
      + '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day,precipitation,wind_speed_10m,wind_direction_10m'
      + '&hourly=temperature_2m,precipitation_probability,weather_code,is_day'
      + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset'
      + '&forecast_days=7&timeformat=unixtime&timezone=auto',
    )
  })

  it('builds the search URL and encodes the name', () => {
    expect(buildSearchUrl('Thessaloniki')).toBe(
      'https://geocoding-api.open-meteo.com/v1/search?name=Thessaloniki&count=8&language=en&format=json',
    )
    expect(buildSearchUrl('  São Paulo & co ')).toBe(
      'https://geocoding-api.open-meteo.com/v1/search?name=S%C3%A3o%20Paulo%20%26%20co&count=8&language=en&format=json',
    )
  })
})

describe('fetchOverview', () => {
  it('returns one entry per point for a multi-location array response', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(overviewFixture))
    const result = await fetchOverview([berlin, paris], { fetchImpl: fetchMock })
    expect(result).toHaveLength(2)
    expect(fetchMock).toHaveBeenCalledWith(buildOverviewUrl([berlin, paris]), undefined)
  })

  it('normalises a single-location object response to an array', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(overviewFixture[0]))
    const result = await fetchOverview([berlin], { fetchImpl: fetchMock })
    expect(result).toEqual([overviewFixture[0]])
  })

  it('does not request anything for an empty list', async () => {
    const fetchMock = vi.fn()
    await expect(fetchOverview([], { fetchImpl: fetchMock })).resolves.toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects a response that does not match the requested points', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(overviewFixture))
    await expect(fetchOverview([berlin], { fetchImpl: fetchMock })).rejects.toThrow('Unexpected overview response')
  })

  it('passes the abort signal through', async () => {
    const controller = new AbortController()
    const fetchMock = vi.fn(async () => jsonResponse(overviewFixture[0]))
    await fetchOverview([berlin], { fetchImpl: fetchMock, signal: controller.signal })
    expect(fetchMock).toHaveBeenCalledWith(expect.any(String), { signal: controller.signal })
  })
})

describe('errors', () => {
  it('throws an HttpError with status and reason', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ error: true, reason: 'Minutely API request limit exceeded.' }, 429))
    const error = await fetchForecast(berlin, { fetchImpl: fetchMock }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(HttpError)
    expect(error).toMatchObject({ status: 429, reason: 'Minutely API request limit exceeded.' })
  })

  it('handles error responses without a JSON body', async () => {
    const fetchMock = vi.fn(async () => new Response('Bad gateway', { status: 502 }))
    await expect(fetchSearch('x', { fetchImpl: fetchMock })).rejects.toMatchObject({ status: 502, reason: undefined })
  })

  it('propagates aborts', async () => {
    const fetchMock = vi.fn(async () => {
      throw new DOMException('Aborted', 'AbortError')
    })
    await expect(fetchSearch('Thess', { fetchImpl: fetchMock })).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('fetchForecast and fetchSearch', () => {
  it('return the raw bodies', async () => {
    await expect(fetchForecast(berlin, { fetchImpl: vi.fn(async () => jsonResponse(forecastFixture)) }))
      .resolves.toEqual(forecastFixture)
    await expect(fetchSearch('Thess', { fetchImpl: vi.fn(async () => jsonResponse(searchFixture)) }))
      .resolves.toEqual(searchFixture)
  })
})
