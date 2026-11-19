/**
 * WMO weather interpretation codes as returned by Open-Meteo, mapped to an
 * i18n label key and a Meteocons icon name.
 */

export type WeatherIcon =
  | 'clear-day'
  | 'clear-night'
  | 'partly-cloudy-day'
  | 'partly-cloudy-night'
  | 'overcast'
  | 'fog-day'
  | 'fog-night'
  | 'drizzle'
  | 'partly-cloudy-day-drizzle'
  | 'partly-cloudy-night-drizzle'
  | 'rain'
  | 'partly-cloudy-day-rain'
  | 'partly-cloudy-night-rain'
  | 'sleet'
  | 'snow'
  | 'partly-cloudy-day-snow'
  | 'partly-cloudy-night-snow'
  | 'thunderstorms-day'
  | 'thunderstorms-night'
  | 'thunderstorms-day-rain'
  | 'thunderstorms-night-rain'
  | 'not-available'

export interface WeatherDescription {
  labelKey: string
  icon: WeatherIcon
}

type IconSpec = WeatherIcon | { day: WeatherIcon, night: WeatherIcon }

interface CodeSpec {
  label: string
  icon: IconSpec
}

const partly = (suffix: '' | '-drizzle' | '-rain' | '-snow'): IconSpec => ({
  day: `partly-cloudy-day${suffix}`,
  night: `partly-cloudy-night${suffix}`,
})

const CODES: Readonly<Record<number, CodeSpec>> = {
  0: { label: 'clearSky', icon: { day: 'clear-day', night: 'clear-night' } },
  1: { label: 'mainlyClear', icon: partly('') },
  2: { label: 'partlyCloudy', icon: partly('') },
  3: { label: 'overcast', icon: 'overcast' },
  45: { label: 'fog', icon: { day: 'fog-day', night: 'fog-night' } },
  48: { label: 'rimeFog', icon: { day: 'fog-day', night: 'fog-night' } },
  51: { label: 'drizzleLight', icon: partly('-drizzle') },
  53: { label: 'drizzleModerate', icon: 'drizzle' },
  55: { label: 'drizzleDense', icon: 'drizzle' },
  56: { label: 'freezingDrizzleLight', icon: 'sleet' },
  57: { label: 'freezingDrizzleDense', icon: 'sleet' },
  61: { label: 'rainSlight', icon: partly('-rain') },
  63: { label: 'rainModerate', icon: 'rain' },
  65: { label: 'rainHeavy', icon: 'rain' },
  66: { label: 'freezingRainLight', icon: 'sleet' },
  67: { label: 'freezingRainHeavy', icon: 'sleet' },
  71: { label: 'snowSlight', icon: partly('-snow') },
  73: { label: 'snowModerate', icon: 'snow' },
  75: { label: 'snowHeavy', icon: 'snow' },
  77: { label: 'snowGrains', icon: 'snow' },
  80: { label: 'showersSlight', icon: partly('-rain') },
  81: { label: 'showersModerate', icon: 'rain' },
  82: { label: 'showersViolent', icon: 'rain' },
  85: { label: 'snowShowersSlight', icon: partly('-snow') },
  86: { label: 'snowShowersHeavy', icon: 'snow' },
  95: { label: 'thunderstorm', icon: { day: 'thunderstorms-day', night: 'thunderstorms-night' } },
  96: { label: 'thunderstormHailSlight', icon: { day: 'thunderstorms-day-rain', night: 'thunderstorms-night-rain' } },
  99: { label: 'thunderstormHailHeavy', icon: { day: 'thunderstorms-day-rain', night: 'thunderstorms-night-rain' } },
}

const LABEL_PREFIX = 'weather.'

/** Every WMO code Open-Meteo documents. */
export const WMO_CODES: readonly number[] = Object.keys(CODES).map(Number)

/** The description used when a code is missing or not documented. */
export const UNKNOWN_WEATHER: WeatherDescription = {
  labelKey: `${LABEL_PREFIX}unknown`,
  icon: 'not-available',
}

/**
 * Describes a WMO weather code. Unknown or missing codes fall back to
 * {@link UNKNOWN_WEATHER}, so callers never have to handle a miss.
 */
export function describeWeather(code: number | null | undefined, isDay = true): WeatherDescription {
  const spec = code == null ? undefined : CODES[code]
  if (!spec) {
    return UNKNOWN_WEATHER
  }
  const icon = typeof spec.icon === 'string' ? spec.icon : spec.icon[isDay ? 'day' : 'night']
  return { labelKey: `${LABEL_PREFIX}${spec.label}`, icon }
}

/** All icon names {@link describeWeather} can return, e.g. to preload map images. */
export const WEATHER_ICONS: readonly WeatherIcon[] = [
  ...new Set([
    UNKNOWN_WEATHER.icon,
    ...WMO_CODES.flatMap(code => [describeWeather(code, true).icon, describeWeather(code, false).icon]),
  ]),
]
