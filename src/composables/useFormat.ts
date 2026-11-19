import { useI18n } from 'vue-i18n'
import type { LayerId } from '@/domain/types'
import { UNIT_SETS, displayPrecip, displaySpeed, displayTemp } from '@/domain/units'
import { useSettingsStore } from '@/stores/settingsStore'

/** Unit-aware value formatting through i18n. Converts client-side, never refetches. */
export function useFormat() {
  const { t } = useI18n()
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

  return { temp, speed, precip, percent, layerLabel }
}
