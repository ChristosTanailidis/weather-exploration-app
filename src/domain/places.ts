import { haversineKm, nearestCity, normalizeLon, pointKey, roundCoord } from '@/domain/geo'
import type { City, LatLon, Place, PlaceKind } from '@/domain/types'

const CITY_PREFIX = 'city:'

/** Cache key and place key of a dataset city. */
export const cityKey = (city: Pick<City, 'id'>): string => `${CITY_PREFIX}${city.id}`

/** The dataset id in a city key, or `null` for any other key. */
export function cityIdOf(key: string): number | null {
  if (!key.startsWith(CITY_PREFIX)) {
    return null
  }
  const id = Number(key.slice(CITY_PREFIX.length))
  return Number.isInteger(id) ? id : null
}

const PLACE_KINDS: readonly PlaceKind[] = ['city', 'search', 'point', 'location']

const isOptionalString = (value: unknown): boolean => value === undefined || typeof value === 'string'

/** Runtime check for places read back from storage. */
export function isPlace(value: unknown): value is Place {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const place = value as Record<string, unknown>
  return typeof place.key === 'string'
    && place.key !== ''
    && typeof place.name === 'string'
    && PLACE_KINDS.includes(place.kind as PlaceKind)
    && typeof place.lat === 'number'
    && Number.isFinite(place.lat)
    && Math.abs(place.lat) <= 90
    && typeof place.lon === 'number'
    && Number.isFinite(place.lon)
    && isOptionalString(place.countryCode)
    && isOptionalString(place.admin1)
    && isOptionalString(place.country)
    && (place.nearKm === undefined || (typeof place.nearKm === 'number' && Number.isFinite(place.nearKm)))
}

/** Valid places from untrusted input, without duplicate keys. */
export function sanitizePlaces(value: unknown): Place[] {
  if (!Array.isArray(value)) {
    return []
  }
  const seen = new Set<string>()
  return value.filter((item): item is Place => {
    if (!isPlace(item) || seen.has(item.key)) {
      return false
    }
    seen.add(item.key)
    return true
  })
}

/** A dataset city as a place. */
export function placeFromCity(city: City): Place {
  return {
    key: cityKey(city),
    kind: 'city',
    name: city.name,
    lat: city.lat,
    lon: city.lon,
    countryCode: city.countryCode,
    admin1: city.admin1,
  }
}

export interface PointNaming {
  /** Coordinate decimals of the point key. */
  precision: number
  /** A point further than this from every city is named by its coordinates. */
  maxKm: number
}

/**
 * A clicked point as a place, named after the nearest dataset city within
 * `maxKm` (no reverse geocoding), otherwise left unnamed so the UI shows
 * its coordinates.
 */
export function placeFromPoint(point: LatLon, cities: readonly City[], naming: PointNaming): Place {
  const lat = roundCoord(point.lat, naming.precision)
  const lon = roundCoord(normalizeLon(point.lon), naming.precision)
  const base = { key: pointKey({ lat, lon }, naming.precision), kind: 'point' as const, lat, lon }
  const city = nearestCity({ lat, lon }, cities, naming.maxKm)
  if (!city) {
    return { ...base, name: '' }
  }
  return {
    ...base,
    name: city.name,
    countryCode: city.countryCode,
    admin1: city.admin1,
    nearKm: Math.round(haversineKm({ lat, lon }, city)),
  }
}

const POINT_KEY = /^pt:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/

/** Rebuilds a place from its key (e.g. from the URL), or `null`. */
export function placeFromKey(key: string, cities: readonly City[], naming: PointNaming): Place | null {
  const id = cityIdOf(key)
  if (id !== null) {
    const city = cities.find(c => c.id === id)
    return city ? placeFromCity(city) : null
  }
  const match = POINT_KEY.exec(key)
  if (!match) {
    return null
  }
  return placeFromPoint({ lat: Number(match[1]), lon: Number(match[2]) }, cities, naming)
}
