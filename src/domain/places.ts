import type { Place, PlaceKind } from '@/domain/types'

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
