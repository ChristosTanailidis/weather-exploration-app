import { useDocumentVisibility } from '@vueuse/core'
import { shallowRef, watch } from 'vue'
import { weatherService } from '@/api/weatherService'
import type { Cached } from '@/api/weatherService'
import { useCities } from '@/composables/useCities'
import { useForecastTime } from '@/composables/useForecastTime'
import { useMapContext } from '@/composables/useMap'
import { config } from '@/config'
import { isOnVisibleHemisphere, thinCities } from '@/domain/geo'
import { cityKey } from '@/domain/places'
import type { City, HourlySeries } from '@/domain/types'
import { useMapStore } from '@/stores/mapStore'

/**
 * Weather for the cities in view. Once the camera settles (the store only
 * gets debounced bounds), candidates are filtered to the visible side of
 * the globe, thinned to the most populous city per screen cell and sent to
 * the weather service as one batched request for cache misses only.
 */
export function useViewportWeather() {
  const { map } = useMapContext()
  const store = useMapStore()
  const { cities } = useCities()

  const visibleCities = shallowRef<readonly City[]>([])
  const weather = shallowRef<ReadonlyMap<string, Cached<HourlySeries>>>(new Map())
  const error = shallowRef<unknown>(undefined)
  const loading = shallowRef(false)

  function pickCities(): City[] {
    const instance = map.value
    if (!instance || !store.bounds) {
      return []
    }
    const container = instance.getContainer()
    const center = store.view
    const candidates = cities.value.filter(city => isOnVisibleHemisphere(city, center, config.hemisphereMarginDeg))
    return thinCities(
      candidates,
      city => instance.project([city.lon, city.lat]),
      { width: container.clientWidth, height: container.clientHeight },
      config.thinningGrid,
      config.maxCityMarkers,
    )
  }

  async function refresh(): Promise<void> {
    const picked = pickCities()
    visibleCities.value = picked
    if (picked.length === 0) {
      return
    }
    loading.value = true
    try {
      const result = await weatherService.getOverview(picked.map(city => ({ key: cityKey(city), lat: city.lat, lon: city.lon })))
      weather.value = new Map([...weather.value, ...result.entries])
      error.value = result.error
    }
    finally {
      loading.value = false
    }
  }

  watch([() => store.bounds, cities], () => {
    void refresh()
  })

  // Expired data is refreshed when the tab becomes visible again and at
  // each new hour, so the 48 h window keeps covering the slider. The
  // service only requests what has expired, and nothing while hidden.
  const visibility = useDocumentVisibility()
  const { nowHourSec } = useForecastTime()
  watch([visibility, nowHourSec], ([state]) => {
    if (state === 'visible') {
      void refresh()
    }
  })

  return { cities: visibleCities, weather, error, loading, refresh }
}
