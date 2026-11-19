/** All tunables in one place. Values are tuned for the Open-Meteo free tier. */
export const config = {
  overviewTtlMs: 30 * 60_000,
  detailTtlMs: 60 * 60_000,
  cacheMaxEntries: 300,
  /** Expired entries are kept this long as a fallback (e.g. when rate limited). */
  cacheMaxStaleMs: 24 * 60 * 60_000,
  /** Waits between retries after HTTP 429. */
  retryBackoffMs: [1_000, 2_000, 4_000],
  moveDebounceMs: 400,
  overviewMinIntervalMs: 1_500,
  searchDebounceMs: 300,
  searchMinChars: 2,
  searchResultCount: 8,
  maxCityMarkers: 48,
  /** Cities this close to the globe's horizon are skipped. */
  hemisphereMarginDeg: 5,
  /** Map icon bitmap size; drawn at half size on screen (pixel ratio 2). */
  mapIconPx: 56,
  mapIconPixelRatio: 2,
  /** From this zoom on, city labels also show the city name. */
  cityNameMinZoom: 6,
  labelTextSizeDesktop: 15,
  labelTextSizeMobile: 14,
  /** Desktop layout (drawer instead of bottom sheet), Tailwind `lg`. */
  desktopMediaQuery: '(min-width: 64rem)',
  /** Right strip kept free for the drawer on desktop; the camera centres in the rest. */
  drawerZonePx: 424,
  thinningGrid: { cols: 8, rows: 6 },
  enableGridLayer: true,
  gridMaxPoints: 80,
  gridOpacity: 0.45,
  maxLocationsPerRequest: 100,
  nearestCityMaxKm: 50,
  forecastHours: 48,
  /** How often the clock behind "now" is refreshed. */
  clockTickMs: 60_000,
  forecastDays: 7,
  coordPrecision: 2,
  mapStyle: 'mapbox://styles/mapbox/dark-v11',
  defaultView: { lat: 30, lon: 15, zoom: 1.5 },
  maxZoom: 22,
  compareMin: 2,
  compareMax: 4,
} as const

/** Values that come from the build environment. */
export const env = {
  mapboxToken: (import.meta.env.VITE_MAPBOX_TOKEN ?? '').trim(),
} as const

/** External links shown in the UI. `liveDemo` stays empty until the app is deployed. */
export const links = {
  mapboxGuide: 'https://docs.mapbox.com/help/getting-started/access-tokens/',
  liveDemo: '',
} as const
