import { shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCities } from '@/composables/useCities'
import { useSearchFocus } from '@/composables/useSearchFocus'
import { config } from '@/config'
import { placeFromPoint } from '@/domain/places'
import type { Place } from '@/domain/types'
import { useMapStore } from '@/stores/mapStore'
import { usePlacesStore } from '@/stores/placesStore'
import { useStatusStore } from '@/stores/statusStore'

export type LocationStatus = 'idle' | 'locating' | 'located' | 'denied' | 'unavailable'

const STATUS_ID = 'location'
const status = shallowRef<LocationStatus>('idle')

/**
 * The user's position. `autoLocate()` only runs when the geolocation
 * permission is already granted, so the page never prompts on load;
 * `locate()` is for the "My location" button and may prompt.
 */
export function useCurrentLocation() {
  const { t } = useI18n()
  const places = usePlacesStore()
  const map = useMapStore()
  const statusStore = useStatusStore()
  const { ready } = useCities()
  const { requestFocus } = useSearchFocus()

  function position(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: config.locationTimeoutMs,
        maximumAge: config.locationMaxAgeMs,
      })
    })
  }

  function reportFailure(error: unknown): void {
    const denied = typeof GeolocationPositionError !== 'undefined'
      && error instanceof GeolocationPositionError
      && error.code === error.PERMISSION_DENIED
    status.value = denied ? 'denied' : 'unavailable'
    statusStore.show(denied
      ? {
          id: STATUS_ID,
          kind: 'info',
          icon: 'locationOff',
          title: t('location.deniedTitle'),
          body: t('location.deniedBody'),
          action: { label: t('location.searchAction'), icon: 'search', run: requestFocus },
          dismissible: true,
        }
      : {
          id: STATUS_ID,
          kind: 'warning',
          icon: 'locationOff',
          title: t('location.unavailableTitle'),
          body: t('location.unavailableBody'),
          action: { label: t('location.retry'), icon: 'refresh', run: () => void locate() },
          dismissible: true,
        })
  }

  async function findMe(): Promise<Place | null> {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reportFailure(null)
      return null
    }
    status.value = 'locating'
    try {
      const { coords } = await position()
      const cities = await ready()
      const place: Place = {
        ...placeFromPoint({ lat: coords.latitude, lon: coords.longitude }, cities, {
          precision: config.coordPrecision,
          maxKm: config.nearestCityMaxKm,
        }),
        kind: 'location',
      }
      places.setCurrentLocation(place)
      status.value = 'located'
      statusStore.clear(STATUS_ID)
      return place
    }
    catch (error) {
      reportFailure(error)
      return null
    }
  }

  /** "My location": find the user, then select the place and fly there. */
  async function locate(): Promise<void> {
    const place = await findMe()
    if (place) {
      places.select(place)
      map.flyTo(place, config.placeZoom)
    }
  }

  /** On load: locate silently, but only if permission was granted before. */
  async function autoLocate(): Promise<void> {
    try {
      const permission = await navigator.permissions?.query({ name: 'geolocation' })
      if (permission?.state === 'granted') {
        await findMe()
      }
    }
    catch {
      // Permissions API unavailable: wait for the button.
    }
  }

  return { status, locate, autoLocate }
}
