import type { City } from '@/domain/types'

/** One row of `public/cities.json`, as written by `scripts/build-cities.ts`. */
type CityRow = [id: number, name: string, countryCode: string, admin1: string, lat: number, lon: number, population: number]

const ROW_LENGTH = 7

function isCityRow(row: unknown): row is CityRow {
  return Array.isArray(row)
    && row.length === ROW_LENGTH
    && typeof row[0] === 'number'
    && typeof row[1] === 'string'
    && typeof row[2] === 'string'
    && typeof row[3] === 'string'
    && Number.isFinite(row[4])
    && Number.isFinite(row[5])
    && typeof row[6] === 'number'
}

/** Turns the compact dataset rows into {@link City} objects, skipping malformed rows. */
export function parseCities(raw: unknown): City[] {
  if (!Array.isArray(raw)) {
    throw new TypeError('The city dataset must be an array')
  }
  return raw.filter(isCityRow).map(([id, name, countryCode, admin1, lat, lon, population]) => ({
    id,
    name,
    countryCode,
    admin1,
    lat,
    lon,
    population,
  }))
}

export const CITIES_URL = `${import.meta.env.BASE_URL}cities.json`

let pending: Promise<City[]> | null = null

/**
 * Loads the static city dataset once per session; concurrent and later
 * callers share the same promise. A failed load can be retried.
 */
export function loadCities(fetchImpl: typeof fetch = fetch): Promise<City[]> {
  pending ??= fetchImpl(CITIES_URL)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Loading the city dataset failed with HTTP ${response.status}`)
      }
      return response.json() as Promise<unknown>
    })
    .then(parseCities)
    .catch((error: unknown) => {
      pending = null
      throw error
    })
  return pending
}
