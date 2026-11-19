import { config } from '@/config'
import { normalizeLon, roundCoord } from '@/domain/geo'
import type { LatLon } from '@/domain/types'

/*
 * Typed raw clients for the Open-Meteo Forecast and Geocoding APIs.
 * Raw response shapes never leave `api/`: see mappers.ts.
 */

export const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
export const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search'

/** Variables for the map overview, grid and collection: all layers from one request. */
export const OVERVIEW_HOURLY = [
  'temperature_2m',
  'weather_code',
  'precipitation',
  'wind_speed_10m',
  'wind_direction_10m',
  'cloud_cover',
  'is_day',
] as const

export const DETAIL_CURRENT = [
  'temperature_2m',
  'apparent_temperature',
  'relative_humidity_2m',
  'weather_code',
  'is_day',
  'precipitation',
  'wind_speed_10m',
  'wind_direction_10m',
] as const

export const DETAIL_HOURLY = ['temperature_2m', 'precipitation_probability', 'weather_code', 'is_day'] as const

export const DETAIL_DAILY = [
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_probability_max',
  'sunrise',
  'sunset',
] as const

type RawValues = (number | null)[]
type Columns<K extends string> = { time: number[] } & { [key in K]: RawValues }

interface RawLocation {
  latitude: number
  longitude: number
  utc_offset_seconds: number
  timezone: string
}

export interface RawOverviewResponse extends RawLocation {
  hourly: Columns<(typeof OVERVIEW_HOURLY)[number]>
}

export interface RawForecastResponse extends RawLocation {
  current: { time: number } & { [key in (typeof DETAIL_CURRENT)[number]]: number | null }
  hourly: Columns<(typeof DETAIL_HOURLY)[number]>
  daily: Columns<(typeof DETAIL_DAILY)[number]>
}

export interface RawGeocodingResult {
  id: number
  name: string
  latitude: number
  longitude: number
  country_code?: string
  country?: string
  admin1?: string
  population?: number
}

export interface RawGeocodingResponse {
  results?: RawGeocodingResult[]
}

/** A non-2xx response. `reason` is Open-Meteo's error message when present. */
export class HttpError extends Error {
  readonly status: number
  readonly reason: string | undefined

  constructor(status: number, url: string, reason?: string) {
    super(`HTTP ${status} for ${url}${reason ? `: ${reason}` : ''}`)
    this.name = 'HttpError'
    this.status = status
    this.reason = reason
  }
}

export interface RequestOptions {
  signal?: AbortSignal
  fetchImpl?: typeof fetch
}

/** Builds a query string without encoding the commas of list values. */
function query(params: Record<string, string | number>): string {
  return Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
    .join('&')
}

const coord = (value: number): string => String(roundCoord(value, config.coordPrecision))

/** URL of the batched overview request for `points`, in order. */
export function buildOverviewUrl(points: readonly LatLon[]): string {
  return `${FORECAST_URL}?${query({
    latitude: points.map(p => coord(p.lat)).join(','),
    longitude: points.map(p => coord(normalizeLon(p.lon))).join(','),
    hourly: OVERVIEW_HOURLY.join(','),
    forecast_hours: config.forecastHours,
    timeformat: 'unixtime',
    timezone: 'auto',
  })}`
}

/** URL of the place details request. */
export function buildForecastUrl(point: LatLon): string {
  return `${FORECAST_URL}?${query({
    latitude: coord(point.lat),
    longitude: coord(normalizeLon(point.lon)),
    current: DETAIL_CURRENT.join(','),
    hourly: DETAIL_HOURLY.join(','),
    daily: DETAIL_DAILY.join(','),
    forecast_days: config.forecastDays,
    timeformat: 'unixtime',
    timezone: 'auto',
  })}`
}

/** URL of a name search. */
export function buildSearchUrl(name: string): string {
  return `${GEOCODING_URL}?${query({
    name: encodeURIComponent(name.trim()),
    count: config.searchResultCount,
    language: 'en',
    format: 'json',
  })}`
}

function errorReason(body: unknown): string | undefined {
  if (body && typeof body === 'object' && 'reason' in body && typeof body.reason === 'string') {
    return body.reason
  }
  return undefined
}

async function getJson(url: string, { signal, fetchImpl = fetch }: RequestOptions): Promise<unknown> {
  const response = await fetchImpl(url, signal ? { signal } : undefined)
  const body: unknown = await response.json().catch(() => undefined)
  if (!response.ok) {
    throw new HttpError(response.status, url, errorReason(body))
  }
  return body
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Overview data for `points`, one entry per point in the same order.
 * Open-Meteo answers a single location with an object and several with an
 * array; both are normalised to an array.
 */
export async function fetchOverview(points: readonly LatLon[], options: RequestOptions = {}): Promise<RawOverviewResponse[]> {
  if (points.length === 0) {
    return []
  }
  const url = buildOverviewUrl(points)
  const body = await getJson(url, options)
  const list = Array.isArray(body) ? body : [body]
  if (list.length !== points.length || !list.every(isObject)) {
    throw new Error(`Unexpected overview response for ${points.length} location(s)`)
  }
  return list as unknown as RawOverviewResponse[]
}

/** Detailed forecast for one place. */
export async function fetchForecast(point: LatLon, options: RequestOptions = {}): Promise<RawForecastResponse> {
  const body = await getJson(buildForecastUrl(point), options)
  if (!isObject(body)) {
    throw new Error('Unexpected forecast response')
  }
  return body as unknown as RawForecastResponse
}

/** Name search. */
export async function fetchSearch(name: string, options: RequestOptions = {}): Promise<RawGeocodingResponse> {
  const body = await getJson(buildSearchUrl(name), options)
  if (!isObject(body)) {
    throw new Error('Unexpected geocoding response')
  }
  return body as RawGeocodingResponse
}
