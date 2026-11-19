import { onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { weatherService } from '@/api/weatherService'
import type { RequestStats } from '@/api/weatherService'

/** Live request counters of the weather service. */
export function useRequestStats() {
  const stats = shallowRef<RequestStats>(weatherService.getStats())
  let stop: (() => void) | undefined
  onMounted(() => {
    stats.value = weatherService.getStats()
    stop = weatherService.onStats((next) => {
      stats.value = next
    })
  })
  onBeforeUnmount(() => stop?.())
  return stats
}
