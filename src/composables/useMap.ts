import { useDebounceFn } from '@vueuse/core'
import mapboxgl from 'mapbox-gl'
import { inject, onBeforeUnmount, onMounted, provide, readonly, shallowRef } from 'vue'
import type { InjectionKey, Ref, ShallowRef } from 'vue'
import { config, env } from '@/config'
import type { Bounds } from '@/domain/geo'
import { useMapStore } from '@/stores/mapStore'

export interface MapContext {
  /** The map instance. Kept in a shallowRef: Mapbox objects must never become deeply reactive. */
  map: Readonly<ShallowRef<mapboxgl.Map | null>>
  /** `true` while a style is loaded and sources/layers can be added. */
  styleReady: Readonly<Ref<boolean>>
}

const MAP_CONTEXT: InjectionKey<MapContext> = Symbol('map')

function readBounds(map: mapboxgl.Map): Bounds {
  const bounds = map.getBounds()
  return { west: bounds.getWest(), south: bounds.getSouth(), east: bounds.getEast(), north: bounds.getNorth() }
}

/**
 * Creates the globe map in `container` on mount and removes it on unmount.
 * The settled camera (debounced `moveend`) is written to the map store.
 * Child components get the map through {@link useMapContext}.
 */
export function useMap(container: Readonly<ShallowRef<HTMLElement | null>>): MapContext {
  const store = useMapStore()
  const map = shallowRef<mapboxgl.Map | null>(null)
  const styleReady = shallowRef(false)

  const syncCamera = useDebounceFn(() => {
    const instance = map.value
    if (!instance) {
      return
    }
    const center = instance.getCenter()
    store.setView({ lat: center.lat, lon: center.lng, zoom: instance.getZoom() })
    store.setBounds(readBounds(instance))
  }, config.moveDebounceMs)

  onMounted(() => {
    if (!container.value) {
      return
    }
    const instance = new mapboxgl.Map({
      container: container.value,
      accessToken: env.mapboxToken,
      style: config.mapStyle,
      projection: 'globe',
      center: [store.view.lon, store.view.lat],
      zoom: store.view.zoom,
      maxZoom: config.maxZoom,
    })
    instance.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right')
    instance.on('style.load', () => {
      styleReady.value = true
    })
    instance.on('moveend', () => {
      void syncCamera()
    })
    instance.once('load', () => {
      void syncCamera()
    })
    map.value = instance
  })

  onBeforeUnmount(() => {
    styleReady.value = false
    map.value?.remove()
    map.value = null
  })

  const context: MapContext = { map, styleReady: readonly(styleReady) }
  provide(MAP_CONTEXT, context)
  return context
}

/** The map of the surrounding `MapView`. */
export function useMapContext(): MapContext {
  const context = inject(MAP_CONTEXT)
  if (!context) {
    throw new Error('useMapContext() must be used inside MapView')
  }
  return context
}
