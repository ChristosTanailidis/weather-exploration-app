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
  /** Mobile sheets: movement before a press becomes a drag (smaller is a tap). */
  sheetDragSlopPx: 6,
  /** Release speed is measured over the last moves within this window. */
  sheetVelocityWindowMs: 100,
  /** How far the release speed carries a sheet before it settles on the nearest stop. */
  sheetProjectionMs: 150,
  /** From this release speed on, a swipe always moves the sheet one stop. */
  sheetFlickPxPerMs: 0.5,
  thinningGrid: { cols: 8, rows: 6 },
  enableGridLayer: true,
  gridMaxPoints: 80,
  gridOpacity: 0.45,
  /** Each grid cell is drawn as n × n interpolated sub-cells (no extra requests). */
  gridSubdivisions: 6,
  maxLocationsPerRequest: 100,
  nearestCityMaxKm: 50,
  /** Geolocation: a coarse position is enough; reuse one up to 10 min old. */
  locationTimeoutMs: 10_000,
  locationMaxAgeMs: 10 * 60_000,
  /** Success messages in the status slot hide after this; errors stay. */
  statusAutoHideMs: 5_000,
  /** After a failed overview request (retries included), try again after this. */
  feedRetryMs: 30_000,
  countdownTickMs: 1_000,
  forecastHours: 48,
  /** How often the clock behind "now" is refreshed. */
  clockTickMs: 60_000,
  forecastDays: 7,
  coordPrecision: 2,
  mapStyle: 'mapbox://styles/mapbox/dark-v11',
  defaultView: { lat: 30, lon: 15, zoom: 1.5 },
  /** Zoom used when flying to a place (never zooms out). */
  placeZoom: 7,
  flyDurationMs: 1_200,
  /** Space kept around "My world" (camera padding for the drawer zone comes on top). */
  fitPaddingPx: 96,
  /** My places rows show the low/high over this many hours (from overview data). */
  summaryHours: 24,
  maxZoom: 22,
  compareMin: 2,
  compareMax: 4,
} as const

/** Values that come from the build environment. */
export const env = {
  mapboxToken: (import.meta.env.VITE_MAPBOX_TOKEN ?? '').trim(),
} as const

/** External links shown in the UI. */
export const links = {
  mapboxGuide: 'https://docs.mapbox.com/help/getting-started/access-tokens/',
  openMeteo: 'https://open-meteo.com/',
  geonames: 'https://www.geonames.org/',
  liveDemo: 'https://weather-exploration-app.vercel.app/',
} as const
