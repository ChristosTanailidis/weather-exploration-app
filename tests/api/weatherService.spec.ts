import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createCache } from '@/api/cache'
import { createWeatherService, detailKey } from '@/api/weatherService'
import type { OverviewPoint, WeatherServiceDeps } from '@/api/weatherService'
import { config } from '@/config'
import forecastFixture from './fixtures/forecast.json'
import { MemoryStorage } from '../helpers/memoryStorage'

const MINUTE = 60_000

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

/** A fake overview location whose temperature encodes its latitude. */
function rawLocation(lat: number, lon: number) {
  return {
    latitude: lat,
    longitude: lon,
    utc_offset_seconds: 0,
    timezone: 'GMT',
    hourly: {
      time: [1795183200, 1795186800],
      temperature_2m: [lat, lat],
      weather_code: [0, 0],
      precipitation: [0, 0],
      wind_speed_10m: [5, 5],
      wind_direction_10m: [90, 90],
      cloud_cover: [0, 0],
      is_day: [1, 1],
    },
  }
}

/** Answers overview requests for whatever coordinates the URL asks for. */
function overviewFetch() {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input))
    const lats = (url.searchParams.get('latitude') ?? '').split(',').map(Number)
    const lons = (url.searchParams.get('longitude') ?? '').split(',').map(Number)
    const body = lats.map((lat, i) => rawLocation(lat, lons[i] ?? 0))
    return jsonResponse(body.length === 1 ? body[0] : body)
  })
}

function requestedLats(fetchMock: ReturnType<typeof vi.fn>, call = 0): number[] {
  const url = new URL(String(fetchMock.mock.calls[call]?.[0]))
  return (url.searchParams.get('latitude') ?? '').split(',').map(Number)
}

const point = (n: number): OverviewPoint => ({ key: `city:${n}`, lat: n / 10, lon: n / 10 })
const points = (from: number, to: number) => Array.from({ length: to - from }, (_, i) => point(from + i))

let storage: MemoryStorage

function service(deps: WeatherServiceDeps = {}) {
  const cache = createCache({ maxEntries: 1000, maxStaleMs: config.cacheMaxStaleMs, storage })
  return createWeatherService({ cache, isHidden: () => false, ...deps })
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-20T10:00:00Z'))
  storage = new MemoryStorage()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('batching', () => {
  it('sends all misses as one request', async () => {
    const fetchImpl = overviewFetch()
    const result = await service({ fetchImpl }).getOverview(points(1, 4))
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(requestedLats(fetchImpl)).toEqual([0.1, 0.2, 0.3])
    expect([...result.entries.keys()]).toEqual(['city:1', 'city:2', 'city:3'])
    expect(result.entries.get('city:2')?.data.tempC).toEqual([0.2, 0.2])
  })

  it('chunks at maxLocationsPerRequest', async () => {
    const fetchImpl = overviewFetch()
    const pending = service({ fetchImpl }).getOverview(points(0, 250))
    await vi.runAllTimersAsync()
    const result = await pending
    expect(fetchImpl).toHaveBeenCalledTimes(3)
    expect([0, 1, 2].map(call => requestedLats(fetchImpl, call).length)).toEqual([100, 100, 50])
    expect(result.entries.size).toBe(250)
  })

  it('sends nothing for an empty list and collapses duplicate keys', async () => {
    const fetchImpl = overviewFetch()
    const s = service({ fetchImpl })
    await s.getOverview([])
    expect(fetchImpl).not.toHaveBeenCalled()
    await s.getOverview([point(1), point(1)])
    expect(requestedLats(fetchImpl)).toEqual([0.1])
  })
})

describe('cache hits and misses', () => {
  it('requests only the keys that are not cached', async () => {
    const fetchImpl = overviewFetch()
    const s = service({ fetchImpl })
    await s.getOverview(points(1, 3))
    await vi.advanceTimersByTimeAsync(config.overviewMinIntervalMs)
    const result = await s.getOverview(points(1, 4))
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(requestedLats(fetchImpl, 1)).toEqual([0.3])
    expect(result.entries.size).toBe(3)
    expect(s.getStats().cacheHits).toBe(2)
  })

  it('causes zero requests for an area seen before', async () => {
    const fetchImpl = overviewFetch()
    const s = service({ fetchImpl })
    await s.getOverview(points(1, 6))
    await vi.advanceTimersByTimeAsync(10 * MINUTE)
    const result = await s.getOverview(points(1, 6))
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect([...result.entries.values()].every(entry => !entry.stale)).toBe(true)
  })

  it('causes zero requests after a reload within the TTL', async () => {
    await service({ fetchImpl: overviewFetch() }).getOverview(points(1, 6))
    await vi.advanceTimersByTimeAsync(config.overviewTtlMs - MINUTE)
    const fetchAfterReload = overviewFetch()
    const result = await service({ fetchImpl: fetchAfterReload }).getOverview(points(1, 6))
    expect(fetchAfterReload).not.toHaveBeenCalled()
    expect(result.entries.size).toBe(5)
  })

  it('refetches once the TTL has passed', async () => {
    const fetchImpl = overviewFetch()
    const s = service({ fetchImpl })
    await s.getOverview([point(1)])
    await vi.advanceTimersByTimeAsync(config.overviewTtlMs)
    await s.getOverview([point(1)])
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })
})

describe('cache keys', () => {
  it('stores overview data under the caller key and details under detail:<key>', async () => {
    const cache = createCache({ maxEntries: 100, maxStaleMs: 0, storage })
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) =>
      String(input).includes('current=') ? jsonResponse(forecastFixture) : overviewFetch()(input))
    const s = createWeatherService({ cache, fetchImpl, isHidden: () => false })
    await s.getOverview([{ key: 'pt:40.64,22.94', lat: 40.64, lon: 22.94 }])
    await s.getForecast({ key: 'pt:40.64,22.94', lat: 40.64, lon: 22.94 })
    expect(cache.get('pt:40.64,22.94')).toBeDefined()
    expect(cache.get(detailKey('pt:40.64,22.94'))).toBeDefined()
    expect(storage.getItem('wx1:detail:pt:40.64,22.94')).not.toBeNull()
  })
})

describe('in-flight dedupe', () => {
  it('never requests a key that is already in flight', async () => {
    const fetchImpl = overviewFetch()
    const s = service({ fetchImpl })
    const first = s.getOverview(points(1, 4))
    const second = s.getOverview(points(2, 4))
    const [a, b] = await Promise.all([first, second])
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(a.entries.size).toBe(3)
    expect(b.entries.get('city:3')).toEqual(a.entries.get('city:3'))
  })

  it('requests only the new keys of an overlapping call', async () => {
    const fetchImpl = overviewFetch()
    const s = service({ fetchImpl })
    const first = s.getOverview(points(1, 3))
    const second = s.getOverview(points(2, 5))
    await vi.runAllTimersAsync()
    await Promise.all([first, second])
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(requestedLats(fetchImpl, 1)).toEqual([0.3, 0.4])
  })

  it('shares one details request between concurrent callers', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(forecastFixture))
    const s = service({ fetchImpl })
    const target = { key: 'city:1', lat: 1, lon: 2 }
    const [a, b] = await Promise.all([s.getForecast(target), s.getForecast(target)])
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(a).toBe(b)
  })
})

describe('throttle', () => {
  it('starts overview requests at least overviewMinIntervalMs apart', async () => {
    const fetchImpl = overviewFetch()
    const s = service({ fetchImpl })
    await s.getOverview([point(1)])
    const second = s.getOverview([point(2)])
    await vi.advanceTimersByTimeAsync(config.overviewMinIntervalMs - 1)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    await second
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('does not delay a request after a quiet period', async () => {
    const fetchImpl = overviewFetch()
    const s = service({ fetchImpl })
    await s.getOverview([point(1)])
    await vi.advanceTimersByTimeAsync(config.overviewMinIntervalMs)
    await s.getOverview([point(2)])
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })
})

describe('HTTP 429', () => {
  const rateLimited = () => jsonResponse({ error: true, reason: 'Minutely API request limit exceeded.' }, 429)

  it('retries with 1 s, 2 s and 4 s backoff', async () => {
    const fetchImpl = vi.fn()
      .mockImplementationOnce(async () => rateLimited())
      .mockImplementationOnce(async () => rateLimited())
      .mockImplementationOnce(async () => rateLimited())
      .mockImplementation(async () => jsonResponse(forecastFixture))
    const pending = service({ fetchImpl }).getForecast({ key: 'city:1', lat: 1, lon: 2 })

    await vi.advanceTimersByTimeAsync(0)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(999)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1_999)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1)
    expect(fetchImpl).toHaveBeenCalledTimes(3)
    await vi.advanceTimersByTimeAsync(4_000)
    expect(fetchImpl).toHaveBeenCalledTimes(4)
    await expect(pending).resolves.toMatchObject({ stale: false })
  })

  it('retries overview requests without breaking the throttle', async () => {
    const fetchImpl = vi.fn()
      .mockImplementationOnce(async () => rateLimited())
      .mockImplementation(overviewFetch())
    const pending = service({ fetchImpl }).getOverview([point(1)])

    await vi.advanceTimersByTimeAsync(config.overviewMinIntervalMs - 1)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    const result = await pending
    expect(result.error).toBeUndefined()
    expect(result.entries.get('city:1')?.stale).toBe(false)
  })

  it('falls back to stale data with its age after the last retry', async () => {
    const s0 = service({ fetchImpl: overviewFetch() })
    await s0.getOverview([point(1)])
    const fetchedAt = Date.now()
    await vi.advanceTimersByTimeAsync(config.overviewTtlMs + 5 * MINUTE)

    const fetchImpl = vi.fn(async () => rateLimited())
    const pending = service({ fetchImpl }).getOverview([point(1), point(2)])
    await vi.runAllTimersAsync()
    const result = await pending

    expect(fetchImpl).toHaveBeenCalledTimes(1 + config.retryBackoffMs.length)
    expect(result.error).toMatchObject({ status: 429 })
    expect(result.entries.get('city:1')).toMatchObject({ stale: true, fetchedAt })
    expect(result.entries.has('city:2')).toBe(false)
  })

  it('does not retry other errors', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: true, reason: 'Bad request' }, 400))
    const result = await service({ fetchImpl }).getOverview([point(1)])
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(result.error).toMatchObject({ status: 400 })
  })

  it('serves stale details when the details request keeps failing', async () => {
    const target = { key: 'city:1', lat: 1, lon: 2 }
    await service({ fetchImpl: vi.fn(async () => jsonResponse(forecastFixture)) }).getForecast(target)
    await vi.advanceTimersByTimeAsync(config.detailTtlMs + MINUTE)

    const fetchImpl = vi.fn(async () => rateLimited())
    const pending = service({ fetchImpl }).getForecast(target)
    await vi.runAllTimersAsync()
    await expect(pending).resolves.toMatchObject({ stale: true })
    expect(fetchImpl).toHaveBeenCalledTimes(4)
  })

  it('rejects details when there is nothing to fall back to', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}, 500))
    await expect(service({ fetchImpl }).getForecast({ key: 'x', lat: 0, lon: 0 })).rejects.toMatchObject({ status: 500 })
  })
})

describe('hidden page', () => {
  it('serves expired data stale instead of refreshing', async () => {
    let hidden = false
    const fetchImpl = overviewFetch()
    const s = service({ fetchImpl, isHidden: () => hidden })
    await s.getOverview([point(1)])
    await vi.advanceTimersByTimeAsync(config.overviewTtlMs + MINUTE)

    hidden = true
    const whileHidden = await s.getOverview([point(1)])
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(whileHidden.entries.get('city:1')?.stale).toBe(true)

    hidden = false
    const visible = await s.getOverview([point(1)])
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(visible.entries.get('city:1')?.stale).toBe(false)
  })
})

describe('request counter', () => {
  it('counts requests and locations, retries included', async () => {
    const fetchImpl = vi.fn()
      .mockImplementationOnce(async () => jsonResponse({}, 429))
      .mockImplementation(overviewFetch())
    const s = service({ fetchImpl })
    const listener = vi.fn()
    s.onStats(listener)
    const pending = s.getOverview(points(1, 4))
    await vi.runAllTimersAsync()
    await pending
    expect(s.getStats()).toEqual({ requests: 2, locations: 6, cacheHits: 0 })
    expect(listener).toHaveBeenLastCalledWith({ requests: 2, locations: 6, cacheHits: 0 })
  })

  it('stops notifying after unsubscribe', async () => {
    const s = service({ fetchImpl: overviewFetch() })
    const listener = vi.fn()
    const off = s.onStats(listener)
    off()
    await s.getOverview([point(1)])
    expect(listener).not.toHaveBeenCalled()
  })
})

describe('searchPlaces', () => {
  const searchFetch = () => vi.fn(async () => jsonResponse({ results: [{ id: 1, name: 'Thessaloniki', latitude: 40.6, longitude: 22.9 }] }))

  it('ignores queries below the minimum length', async () => {
    const fetchImpl = searchFetch()
    await expect(service({ fetchImpl }).searchPlaces(' T ')).resolves.toEqual([])
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('caches results for the session, case-insensitively, without persisting them', async () => {
    const fetchImpl = searchFetch()
    const s = service({ fetchImpl })
    const first = await s.searchPlaces('Thess')
    const second = await s.searchPlaces(' thess ')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(second).toBe(first)
    expect(first[0]?.name).toBe('Thessaloniki')
    expect([...storage.items.keys()].some(key => key.includes('search:'))).toBe(false)
  })

  it('passes the abort signal to fetch', async () => {
    const fetchImpl = searchFetch()
    const controller = new AbortController()
    await service({ fetchImpl }).searchPlaces('Athens', controller.signal)
    expect(fetchImpl).toHaveBeenCalledWith(expect.stringContaining('name=Athens'), { signal: controller.signal })
  })
})
