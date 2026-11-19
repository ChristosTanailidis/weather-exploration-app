import { pointKey } from '@/domain/geo'
import { cityKey } from '@/domain/places'
import type { Place, SearchResult } from '@/domain/types'

export interface TextSegment {
  text: string
  match: boolean
}

/**
 * Splits `name` around the first case-insensitive occurrence of `query`,
 * so the matched letters can be shown in bold.
 */
export function highlightMatch(name: string, query: string): TextSegment[] {
  const needle = query.trim().toLocaleLowerCase()
  const start = needle ? name.toLocaleLowerCase().indexOf(needle) : -1
  if (start < 0) {
    return [{ text: name, match: false }]
  }
  const end = start + needle.length
  return [
    { text: name.slice(0, start), match: false },
    { text: name.slice(start, end), match: true },
    { text: name.slice(end), match: false },
  ].filter(segment => segment.text !== '')
}

/**
 * A search result as a place. Open-Meteo geocoding ids are GeoNames ids, so
 * results that are in the city dataset become dataset cities (and share
 * their cache); anything else is keyed by its coordinates.
 */
export function placeFromSearchResult(result: SearchResult, isDatasetCity: (id: number) => boolean, precision: number): Place {
  const base = {
    name: result.name,
    lat: result.lat,
    lon: result.lon,
    countryCode: result.countryCode,
    admin1: result.admin1,
    country: result.country,
  }
  return isDatasetCity(result.id)
    ? { ...base, key: cityKey(result), kind: 'city' }
    : { ...base, key: pointKey(result, precision), kind: 'search' }
}
