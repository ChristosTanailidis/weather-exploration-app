import { browserStorage, createCache } from '@/api/cache'
import type { Cache } from '@/api/cache'
import { toForecast, toHourlySeries, toSearchResults } from '@/api/mappers'
import { HttpError, fetchForecast, fetchOverview, fetchSearch } from '@/api/openMeteo'
import { config } from '@/config'
import type { Forecast, HourlySeries, LatLon, SearchResult } from '@/domain/types'

/*
 * The only place that decides when Open-Meteo is called. Request rules:
 *
 * 1. Batching: overview points go out as one request, chunked at
 *    `maxLocationsPerRequest`.
 * 2. Fetch only misses: fresh cache hits are never requested.
 * 3. Cache keys come from the caller (`city:<id>`, `pt:<lat>,<lon>`);
 *    details are stored as `detail:<key>`, searches as `search:<query>`.
 * 4. In-flight dedupe: a key that is already being fetched is awaited,
 *    not requested again.
 * 5. Throttle: overview requests start at least `overviewMinIntervalMs` apart.
 * 6. HTTP 429 is retried with backoff (`retryBackoffMs`); after that, or on
 *    any other failure, stale cached data is served with its age.
 * 7. While the page is hidden, expired data is served stale instead of
 *    being refreshed.
 * 8. Every HTTP request and requested location is counted.
 */

/** A point of the overview (map cities, grid, collection) with its cache key. */
export interface OverviewPoint extends LatLon {
  key: string
}

/** A place whose details can be requested. */
export interface ForecastTarget extends LatLon {
  key: string
}

/** Data with its age. `stale` means it is past its TTL (served as a fallback). */
export interface Cached<T> {
  data: T
  fetchedAt: number
  stale: boolean
}

export interface OverviewResult {
  /** Data per requested key; keys without any data are missing. */
  entries: Map<string, Cached<HourlySeries>>
  /** Set when a request of this call failed; affected keys fall back to stale data. */
  error?: unknown
}

export interface RequestStats {
  /** HTTP requests sent, retries included. */
  requests: number
  /** Locations requested from the forecast API, retries included. */
  locations: number
  /** Keys served from the cache without a request. */
  cacheHits: number
}

export interface WeatherServiceDeps {
  fetchImpl?: typeof fetch
  cache?: Cache
  now?: () => number
  sleep?: (ms: number) => Promise<void>
  isHidden?: () => boolean
}

export interface WeatherService {
  getOverview(points: readonly OverviewPoint[]): Promise<OverviewResult>
  getForecast(target: ForecastTarget): Promise<Cached<Forecast>>
  searchPlaces(query: string, signal?: AbortSignal): Promise<SearchResult[]>
  getStats(): RequestStats
  /** Calls `listener` after every counted request; returns an unsubscribe function. */
  onStats(listener: (stats: RequestStats) => void): () => void
}

export const detailKey = (key: string): string => `detail:${key}`
export const searchKey = (query: string): string => `search:${query.trim().toLowerCase()}`

const defaultIsHidden = (): boolean => typeof document !== 'undefined' && document.visibilityState === 'hidden'

const defaultSleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

/** Creates a weather service. Dependencies are injectable for tests. */
export function createWeatherService(deps: WeatherServiceDeps = {}): WeatherService {
  const fetchImpl: typeof fetch = deps.fetchImpl ?? ((input, init) => fetch(input, init))
  const now = deps.now ?? (() => Date.now())
  const sleep = deps.sleep ?? defaultSleep
  const isHidden = deps.isHidden ?? defaultIsHidden
  const cache = deps.cache ?? createCache({
    maxEntries: config.cacheMaxEntries,
    maxStaleMs: config.cacheMaxStaleMs,
    storage: browserStorage(),
    now,
  })

  const overviewInFlight = new Map<string, Promise<Cached<HourlySeries> | undefined>>()
  const forecastInFlight = new Map<string, Promise<Cached<Forecast>>>()
  const stats: RequestStats = { requests: 0, locations: 0, cacheHits: 0 }
  const listeners = new Set<(stats: RequestStats) => void>()
  let nextOverviewAt = 0

  function count(locations: number): void {
    stats.requests += 1
    stats.locations += locations
    listeners.forEach(listener => listener({ ...stats }))
  }

  /** Runs `request`, retrying HTTP 429 with the configured backoff. */
  async function withRetry<T>(request: () => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await request()
      }
      catch (error) {
        const delay = config.retryBackoffMs[attempt]
        if (!(error instanceof HttpError && error.status === 429) || delay === undefined) {
          throw error
        }
        await sleep(delay)
      }
    }
  }

  /** Waits for the next free overview slot, then runs `request`. */
  async function throttled<T>(request: () => Promise<T>): Promise<T> {
    const startAt = Math.max(now(), nextOverviewAt)
    nextOverviewAt = startAt + config.overviewMinIntervalMs
    const wait = startAt - now()
    if (wait > 0) {
      await sleep(wait)
    }
    return request()
  }

  function cached<T>(key: string): Cached<T> | undefined {
    const hit = cache.get<T>(key)
    return hit && { data: hit.value, fetchedAt: hit.storedAt, stale: !hit.fresh }
  }

  /** One overview request (with retries) for a chunk. Never rejects. */
  async function fetchChunk(points: readonly OverviewPoint[]): Promise<{ data: Map<string, Cached<HourlySeries>>, error?: unknown }> {
    const data = new Map<string, Cached<HourlySeries>>()
    try {
      const raw = await withRetry(() => throttled(() => {
        count(points.length)
        return fetchOverview(points, { fetchImpl })
      }))
      const fetchedAt = now()
      raw.forEach((location, i) => {
        const point = points[i]
        if (point) {
          const series = toHourlySeries(location)
          cache.set(point.key, series, config.overviewTtlMs)
          data.set(point.key, { data: series, fetchedAt, stale: false })
        }
      })
      return { data }
    }
    catch (error) {
      for (const point of points) {
        const fallback = cached<HourlySeries>(point.key)
        if (fallback) {
          data.set(point.key, fallback)
        }
      }
      return { data, error }
    }
  }

  async function getOverview(points: readonly OverviewPoint[]): Promise<OverviewResult> {
    const result: OverviewResult = { entries: new Map() }
    const waits: Promise<unknown>[] = []
    const misses: OverviewPoint[] = []
    const unique = [...new Map(points.map(point => [point.key, point])).values()]

    for (const point of unique) {
      const hit = cached<HourlySeries>(point.key)
      if (hit && (!hit.stale || isHidden())) {
        stats.cacheHits += 1
        result.entries.set(point.key, hit)
        continue
      }
      const pending = overviewInFlight.get(point.key)
      if (pending) {
        waits.push(pending.then(entry => entry && result.entries.set(point.key, entry)))
        continue
      }
      misses.push(point)
    }

    for (const group of chunk(misses, config.maxLocationsPerRequest)) {
      const request = fetchChunk(group)
      waits.push(request.then(({ error }) => {
        if (error !== undefined) {
          result.error = error
        }
      }))
      for (const point of group) {
        const entry = request.then(({ data }) => data.get(point.key))
        overviewInFlight.set(point.key, entry)
        waits.push(entry.then((value) => {
          if (overviewInFlight.get(point.key) === entry) {
            overviewInFlight.delete(point.key)
          }
          if (value) {
            result.entries.set(point.key, value)
          }
        }))
      }
    }

    await Promise.all(waits)
    return result
  }

  async function requestForecast(target: ForecastTarget, key: string): Promise<Cached<Forecast>> {
    try {
      const raw = await withRetry(() => {
        count(1)
        return fetchForecast(target, { fetchImpl })
      })
      const data = toForecast(raw)
      cache.set(key, data, config.detailTtlMs)
      return { data, fetchedAt: now(), stale: false }
    }
    catch (error) {
      const fallback = cached<Forecast>(key)
      if (fallback) {
        return fallback
      }
      throw error
    }
  }

  async function getForecast(target: ForecastTarget): Promise<Cached<Forecast>> {
    const key = detailKey(target.key)
    const hit = cached<Forecast>(key)
    if (hit && (!hit.stale || isHidden())) {
      stats.cacheHits += 1
      return hit
    }
    const pending = forecastInFlight.get(key)
    if (pending) {
      return pending
    }
    const request = requestForecast(target, key).finally(() => {
      if (forecastInFlight.get(key) === request) {
        forecastInFlight.delete(key)
      }
    })
    forecastInFlight.set(key, request)
    return request
  }

  async function searchPlaces(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
    const name = query.trim()
    if (name.length < config.searchMinChars) {
      return []
    }
    const key = searchKey(name)
    const hit = cache.get<SearchResult[]>(key)
    if (hit) {
      stats.cacheHits += 1
      return hit.value
    }
    count(0)
    const results = toSearchResults(await fetchSearch(name, { signal, fetchImpl }))
    cache.set(key, results, Number.POSITIVE_INFINITY, { persist: false })
    return results
  }

  return {
    getOverview,
    getForecast,
    searchPlaces,
    getStats: () => ({ ...stats }),
    onStats(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

/** The app-wide service, backed by memory + localStorage. */
export const weatherService = createWeatherService()
