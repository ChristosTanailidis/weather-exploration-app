import { useDocumentVisibility } from '@vueuse/core'
import { computed, watch } from 'vue'
import { weatherService } from '@/api/weatherService'
import { useForecastTime } from '@/composables/useForecastTime'
import { usePlacesStore } from '@/stores/placesStore'

/**
 * Keeps overview weather for the current location and every saved place:
 * the whole collection goes out as one batched request (misses only), when
 * it changes, when the tab becomes visible again and at each new hour.
 * Call once, from a long-lived component.
 */
export function useCollectionWeather(): void {
  const places = usePlacesStore()
  const { nowHourSec } = useForecastTime()
  const visibility = useDocumentVisibility()
  const keys = computed(() => places.listPlaces.map(place => place.key).join('|'))

  async function refresh(): Promise<void> {
    const points = places.listPlaces.map(place => ({ key: place.key, lat: place.lat, lon: place.lon }))
    if (points.length === 0) {
      return
    }
    const result = await weatherService.getOverview(points)
    places.setCollectionWeather(result.entries)
  }

  watch([keys, nowHourSec, visibility], ([, , state]) => {
    if (state === 'visible') {
      void refresh()
    }
  }, { immediate: true })
}
