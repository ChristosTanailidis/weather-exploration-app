import { shallowRef, watch } from 'vue'
import type { Ref } from 'vue'
import { weatherService } from '@/api/weatherService'
import type { Cached } from '@/api/weatherService'
import type { AsyncState, Forecast, Place } from '@/domain/types'

/**
 * Details for the selected place: one request per place, cached for an
 * hour by the weather service (switching back to a place is free).
 */
export function usePlaceForecast(place: Readonly<Ref<Place | null>>) {
  const state = shallowRef<AsyncState<Cached<Forecast>>>({ status: 'idle' })
  let latest = 0

  async function load(target: Place): Promise<void> {
    const request = ++latest
    state.value = { status: 'loading' }
    try {
      const data = await weatherService.getForecast({ key: target.key, lat: target.lat, lon: target.lon })
      if (request === latest) {
        state.value = { status: 'success', data }
      }
    }
    catch (error) {
      if (request === latest) {
        state.value = { status: 'error', error }
      }
    }
  }

  watch(() => place.value?.key, () => {
    if (place.value) {
      void load(place.value)
    }
    else {
      latest += 1
      state.value = { status: 'idle' }
    }
  }, { immediate: true })

  return {
    state,
    retry: (): void => {
      if (place.value) {
        void load(place.value)
      }
    },
  }
}
