import { useLocalStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { defaultUnitSystem } from '@/domain/units'
import type { UnitSystem } from '@/domain/types'

const UNITS_STORAGE_KEY = 'wxe.units'

const browserLocale = (): string | undefined => (typeof navigator === 'undefined' ? undefined : navigator.language)

/** User preferences. Units default from the browser locale and persist. */
export const useSettingsStore = defineStore('settings', () => {
  const fallback = defaultUnitSystem(browserLocale())
  const units = useLocalStorage<UnitSystem>(UNITS_STORAGE_KEY, fallback, {
    serializer: {
      read: raw => (raw === 'metric' || raw === 'imperial' ? raw : fallback),
      write: value => value,
    },
  })

  function setUnits(next: UnitSystem): void {
    units.value = next
  }

  function toggleUnits(): void {
    units.value = units.value === 'metric' ? 'imperial' : 'metric'
  }

  return { units, setUnits, toggleUnits }
})
