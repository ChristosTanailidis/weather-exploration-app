/** All tunables in one place. Values are tuned for the Open-Meteo free tier. */
export const config = {
  overviewTtlMs: 30 * 60_000,
  detailTtlMs: 60 * 60_000,
  cacheMaxEntries: 300,
  moveDebounceMs: 400,
  overviewMinIntervalMs: 1_500,
  searchDebounceMs: 300,
  searchMinChars: 2,
  searchResultCount: 8,
  maxCityMarkers: 48,
  thinningGrid: { cols: 8, rows: 6 },
  enableGridLayer: true,
  gridMaxPoints: 80,
  maxLocationsPerRequest: 100,
  nearestCityMaxKm: 50,
  forecastHours: 48,
  forecastDays: 7,
  coordPrecision: 2,
} as const

/** Values that come from the build environment. */
export const env = {
  mapboxToken: (import.meta.env.VITE_MAPBOX_TOKEN ?? '').trim(),
} as const

/** External links shown in the UI. `liveDemo` stays empty until the app is deployed. */
export const links = {
  mapboxSignup: 'https://account.mapbox.com/auth/signup/',
  liveDemo: '',
} as const
