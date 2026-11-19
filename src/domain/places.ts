import type { City, Place, PlaceKind } from '@/domain/types'

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
