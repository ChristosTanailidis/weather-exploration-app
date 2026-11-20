import { computed } from 'vue'
import { useClock } from '@/composables/useClock'
import { HOUR_SEC, hourStartSec } from '@/domain/mapFeatures'
import { useMapStore } from '@/stores/mapStore'

/** "Now" (start of the current hour) and the instant selected by the time index. */
export function useForecastTime() {
  const store = useMapStore()
  const nowMs = useClock()
  const nowHourSec = computed(() => hourStartSec(nowMs.value))
  const instantSec = computed(() => nowHourSec.value + store.timeIndex * HOUR_SEC)
  return { nowHourSec, instantSec }
}
