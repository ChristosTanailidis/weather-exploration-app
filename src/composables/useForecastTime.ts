import { useIntervalFn } from '@vueuse/core'
import { computed, shallowRef } from 'vue'
import { config } from '@/config'
import { HOUR_SEC, hourStartSec } from '@/domain/mapFeatures'
import { useMapStore } from '@/stores/mapStore'

/** "Now" (start of the current hour) and the instant selected by the time index. */
export function useForecastTime() {
  const store = useMapStore()
  const nowMs = shallowRef(Date.now())
  useIntervalFn(() => {
    nowMs.value = Date.now()
  }, config.clockTickMs)
  const nowHourSec = computed(() => hourStartSec(nowMs.value))
  const instantSec = computed(() => nowHourSec.value + store.timeIndex * HOUR_SEC)
  return { nowHourSec, instantSec }
}
