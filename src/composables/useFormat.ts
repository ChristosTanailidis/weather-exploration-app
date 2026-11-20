import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { LayerId, Place } from '@/domain/types'
import { UNIT_SETS, displayPrecip, displaySpeed, displayTemp } from '@/domain/units'
import { useSettingsStore } from '@/stores/settingsStore'

/** Unit-aware value formatting through i18n. Converts client-side, never refetches. */
export function useFormat() {
  const { t, locale } = useI18n()
  const settings = useSettingsStore()

  const missing = (): string => t('units.missing')

  function temp(tempC: number | null | undefined, short = false): string {
    const value = displayTemp(tempC, settings.units)
    if (value === null) {
      return missing()
    }
    return short ? t('units.tempShort', { value }) : t(`units.${UNIT_SETS[settings.units].temp}`, { value })
  }

  function speed(speedKmh: number | null | undefined): string {
    const value = displaySpeed(speedKmh, settings.units)
    return value === null ? missing() : t(`units.${UNIT_SETS[settings.units].speed}`, { value })
  }

  function precip(precipMm: number | null | undefined): string {
    const value = displayPrecip(precipMm, settings.units)
    return value === null ? missing() : t(`units.${UNIT_SETS[settings.units].precip}`, { value })
  }

  function percent(value: number | null | undefined): string {
    return value == null || !Number.isFinite(value) ? missing() : t('units.percent', { value: Math.round(value) })
  }

  /** Short map label for a layer value. */
  function layerLabel(value: number | null, layer: LayerId): string {
    switch (layer) {
      case 'temperature':
        return temp(value, true)
      case 'precipitation':
        return precip(value)
      case 'wind':
        return speed(value)
      case 'clouds':
        return percent(value)
    }
  }

  const COORD_DECIMALS = 2

  /** "38.20°N, 24.10°E" */
  function coords(lat: number, lon: number): string {
    return t('place.coords', {
      lat: Math.abs(lat).toFixed(COORD_DECIMALS),
      ns: t(lat >= 0 ? 'place.north' : 'place.south'),
      lon: Math.abs(lon).toFixed(COORD_DECIMALS),
      ew: t(lon >= 0 ? 'place.east' : 'place.west'),
    })
  }

  /** A place's title: its name, "Near Kozani · 12 km" for a clicked point, or its coordinates. */
  function placeTitle(place: Place): string {
    if (place.kind === 'point' && place.nearKm !== undefined && place.name) {
      return t('place.near', { name: place.name, km: place.nearKm })
    }
    return place.name || coords(place.lat, place.lon)
  }

  /** Region line: "Central Macedonia · Greece" (country name from the code if needed). */
  function region(place: Pick<Place, 'admin1' | 'country' | 'countryCode'>): string {
    const country = place.country || countryName(place.countryCode)
    if (place.admin1 && country) {
      return t('search.region', { admin1: place.admin1, country })
    }
    return place.admin1 || country
  }

  function countryName(code: string | undefined): string {
    if (!code) {
      return ''
    }
    try {
      return new Intl.DisplayNames([locale.value], { type: 'region' }).of(code.toUpperCase()) ?? code
    }
    catch {
      return code
    }
  }

  const clockFormat = computed(() => new Intl.DateTimeFormat(locale.value, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC' }))
  const dayFormat = computed(() => new Intl.DateTimeFormat(locale.value, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }))
  const weekdayFormat = computed(() => new Intl.DateTimeFormat(locale.value, { weekday: 'short', timeZone: 'UTC' }))
  const weekdayDayFormat = computed(() => new Intl.DateTimeFormat(locale.value, { weekday: 'short', day: 'numeric', timeZone: 'UTC' }))

  /** Formatters for a place's wall clock (dates from `localClock`, read in UTC). */
  const local = {
    clock: (date: Date): string => clockFormat.value.format(date),
    day: (date: Date): string => dayFormat.value.format(date),
    weekday: (date: Date): string => weekdayFormat.value.format(date),
    weekdayDay: (date: Date): string => weekdayDayFormat.value.format(date),
  }

  return { temp, speed, precip, percent, layerLabel, coords, placeTitle, region, countryName, local }
}
