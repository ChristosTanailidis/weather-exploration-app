import type { RawForecastResponse, RawGeocodingResponse, RawOverviewResponse } from '@/api/openMeteo'
import type { Forecast, HourlySeries, SearchResult, Series } from '@/domain/types'

/*
 * Raw Open-Meteo responses → domain types. Mappers are defensive: missing
 * arrays become empty, non-numeric values become `null`, and every series is
 * aligned to the length of its time axis.
 */

function times(value: unknown): number[] {
  return Array.isArray(value) ? value.filter((t): t is number => Number.isFinite(t)) : []
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function series(value: unknown, length: number): Series {
  const source: readonly unknown[] = Array.isArray(value) ? value : []
  return Array.from({ length }, (_, i) => num(source[i]))
}

function flags(value: unknown, length: number): boolean[] {
  const source: readonly unknown[] = Array.isArray(value) ? value : []
  return Array.from({ length }, (_, i) => source[i] === 1)
}

/** Overview response for one location → hourly series. */
export function toHourlySeries(raw: RawOverviewResponse): HourlySeries {
  const hourly: Partial<RawOverviewResponse['hourly']> = raw.hourly ?? {}
  const timesSec = times(hourly.time)
  const n = timesSec.length
  return {
    timesSec,
    utcOffsetSec: num(raw.utc_offset_seconds) ?? 0,
    tempC: series(hourly.temperature_2m, n),
    weatherCode: series(hourly.weather_code, n),
    precipMm: series(hourly.precipitation, n),
    windKmh: series(hourly.wind_speed_10m, n),
    windDirDeg: series(hourly.wind_direction_10m, n),
    cloudPct: series(hourly.cloud_cover, n),
    isDay: flags(hourly.is_day, n),
  }
}

/** Place details response → forecast. */
export function toForecast(raw: RawForecastResponse): Forecast {
  const current: Partial<RawForecastResponse['current']> = raw.current ?? {}
  const hourly: Partial<RawForecastResponse['hourly']> = raw.hourly ?? {}
  const daily: Partial<RawForecastResponse['daily']> = raw.daily ?? {}
  const hourlyTimes = times(hourly.time)
  const dailyTimes = times(daily.time)
  const h = hourlyTimes.length
  const d = dailyTimes.length

  return {
    lat: raw.latitude,
    lon: raw.longitude,
    timezone: typeof raw.timezone === 'string' ? raw.timezone : 'GMT',
    utcOffsetSec: num(raw.utc_offset_seconds) ?? 0,
    current: {
      timeSec: num(current.time) ?? 0,
      tempC: num(current.temperature_2m),
      apparentTempC: num(current.apparent_temperature),
      humidityPct: num(current.relative_humidity_2m),
      weatherCode: num(current.weather_code),
      isDay: current.is_day === 1,
      precipMm: num(current.precipitation),
      windKmh: num(current.wind_speed_10m),
      windDirDeg: num(current.wind_direction_10m),
    },
    hourly: {
      timesSec: hourlyTimes,
      tempC: series(hourly.temperature_2m, h),
      precipProbPct: series(hourly.precipitation_probability, h),
      weatherCode: series(hourly.weather_code, h),
      isDay: flags(hourly.is_day, h),
    },
    daily: {
      timesSec: dailyTimes,
      weatherCode: series(daily.weather_code, d),
      tempMaxC: series(daily.temperature_2m_max, d),
      tempMinC: series(daily.temperature_2m_min, d),
      precipProbMaxPct: series(daily.precipitation_probability_max, d),
      sunriseSec: series(daily.sunrise, d),
      sunsetSec: series(daily.sunset, d),
    },
  }
}

/** Geocoding response → search results; entries without coordinates are dropped. */
export function toSearchResults(raw: RawGeocodingResponse): SearchResult[] {
  const results = Array.isArray(raw.results) ? raw.results : []
  return results
    .filter(r => Number.isFinite(r.latitude) && Number.isFinite(r.longitude) && typeof r.name === 'string')
    .map(r => ({
      id: r.id,
      name: r.name,
      lat: r.latitude,
      lon: r.longitude,
      countryCode: r.country_code ?? '',
      country: r.country ?? '',
      admin1: r.admin1 ?? '',
    }))
}
