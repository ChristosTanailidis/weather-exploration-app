import { watch } from 'vue'
import { config } from '@/config'
import { useRoute, useRouter } from 'vue-router'
import type { LocationQuery } from 'vue-router'
import { URL_STATE_KEYS, parseUrlState, serializeUrlState } from '@/domain/urlState'
import type { UrlState } from '@/domain/urlState'
import type { Place } from '@/domain/types'
import { useMapStore } from '@/stores/mapStore'
import { usePlacesStore } from '@/stores/placesStore'

export interface UrlStateOptions {
  /** Turns a `place` key from the URL back into a place (e.g. via the city dataset). */
  resolvePlace?: (key: string) => Place | null | Promise<Place | null>
}

function foreignParams(query: LocationQuery): LocationQuery {
  const keys: readonly string[] = URL_STATE_KEYS
  return Object.fromEntries(Object.entries(query).filter(([key]) => !keys.includes(key)))
}

/**
 * Two-way sync between the stores and the URL query. On load, valid URL
 * values win over persisted ones; afterwards store changes replace the
 * query (no history entries). Other query params such as `debug` are kept.
 */
export function useUrlState(options: UrlStateOptions = {}): void {
  const route = useRoute()
  const router = useRouter()
  const map = useMapStore()
  const places = usePlacesStore()

  const initial = parseUrlState(route.query)
  if (initial.view) {
    map.setView(initial.view)
  }
  if (initial.layer) {
    map.setLayer(initial.layer)
  }
  if (initial.t !== undefined) {
    map.setTimeIndex(initial.t)
  }
  if (initial.place && options.resolvePlace) {
    Promise.resolve(options.resolvePlace(initial.place))
      .then(place => place && places.select(place))
      .catch(() => undefined)
  }

  const isDefaultView = (): boolean =>
    map.view.lat === config.defaultView.lat
    && map.view.lon === config.defaultView.lon
    && map.view.zoom === config.defaultView.zoom

  const current = (): UrlState => ({
    view: isDefaultView() ? undefined : map.view,
    place: places.selected?.key,
    layer: map.activeLayer === map.DEFAULT_LAYER ? undefined : map.activeLayer,
    t: map.timeIndex === 0 ? undefined : map.timeIndex,
  })

  watch(
    () => serializeUrlState(current()),
    (query) => {
      router.replace({ query: { ...foreignParams(route.query), ...query } }).catch(() => undefined)
    },
    { immediate: true, deep: true },
  )
}
