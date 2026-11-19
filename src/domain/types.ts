/** Map overview layers. All four come from the same overview request. */
export type LayerId = 'temperature' | 'precipitation' | 'wind' | 'clouds'

export const LAYER_IDS: readonly LayerId[] = ['temperature', 'precipitation', 'wind', 'clouds']

export type UnitSystem = 'metric' | 'imperial'

export interface LatLon {
  lat: number
  lon: number
}

/** A city from the static GeoNames dataset. */
export interface City extends LatLon {
  id: number
  name: string
  countryCode: string
  admin1: string
  population: number
}

/** How a place entered the app; drives naming and its cache key. */
export type PlaceKind = 'city' | 'search' | 'point' | 'location'

/** Anything the user can select, pin or compare. */
export interface Place extends LatLon {
  /** Stable identity and cache key, e.g. `city:264371` or `pt:40.64,22.94`. */
  key: string
  kind: PlaceKind
  name: string
  countryCode?: string
  admin1?: string
  country?: string
}

/** A value series aligned with `timesSec`; `null` where the API has no value. */
export type Series = readonly (number | null)[]

/** Hourly overview data for one location (map, grid, collection). */
export interface HourlySeries {
  /** Unix seconds (UTC). Identical across locations of the same request. */
  timesSec: readonly number[]
  utcOffsetSec: number
  tempC: Series
  weatherCode: Series
  precipMm: Series
  windKmh: Series
  windDirDeg: Series
  cloudPct: Series
  isDay: readonly boolean[]
}

export interface CurrentWeather {
  timeSec: number
  tempC: number | null
  apparentTempC: number | null
  humidityPct: number | null
  weatherCode: number | null
  isDay: boolean
  precipMm: number | null
  windKmh: number | null
  windDirDeg: number | null
}

export interface HourlyForecast {
  timesSec: readonly number[]
  tempC: Series
  precipProbPct: Series
  weatherCode: Series
  isDay: readonly boolean[]
}

export interface DailyForecast {
  /** Unix seconds of local midnight for each day. */
  timesSec: readonly number[]
  weatherCode: Series
  tempMaxC: Series
  tempMinC: Series
  precipProbMaxPct: Series
  sunriseSec: Series
  sunsetSec: Series
}

/** Detailed forecast for one place. */
export interface Forecast {
  lat: number
  lon: number
  timezone: string
  utcOffsetSec: number
  current: CurrentWeather
  hourly: HourlyForecast
  daily: DailyForecast
}

/** A place found by name search. */
export interface SearchResult extends LatLon {
  id: number
  name: string
  countryCode: string
  country: string
  admin1: string
}

/** State of an async load, as a discriminated union. */
export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success', data: T }
  | { status: 'error', error: unknown }
