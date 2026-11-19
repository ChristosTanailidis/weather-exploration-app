import { useDebounceFn } from '@vueuse/core'
import mapboxgl from 'mapbox-gl'
import { inject, onMounted, onUnmounted, provide, readonly, shallowRef, watch } from 'vue'
import type { InjectionKey, Ref, ShallowRef } from 'vue'
import { applyBasemapTheme } from '@/composables/mapTheme'
import { useIsDesktop } from '@/composables/useLayout'
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

/** Below this zoom the globe is fully in view: use the whole world (hemisphere filters do the rest). */
const WORLD_BOUNDS_MAX_ZOOM = 3
const WORLD: Bounds = { west: -180, south: -90, east: 180, north: 90 }

/**
 * Bounds of the whole canvas, from its corners and edge midpoints.
 * `getBounds()` follows the camera padding, which would leave out the
 * map behind the drawer zone.
 */
function readBounds(map: mapboxgl.Map): Bounds {
  if (map.getZoom() < WORLD_BOUNDS_MAX_ZOOM) {
    return WORLD
  }
  const { clientWidth: w, clientHeight: h } = map.getContainer()
  const at = (x: number, y: number) => map.unproject([x, y])
  const top = [at(0, 0), at(w / 2, 0), at(w, 0)].map(p => p.lat)
  const bottom = [at(0, h), at(w / 2, h), at(w, h)].map(p => p.lat)
  return {
    west: at(0, h / 2).lng,
    east: at(w, h / 2).lng,
    north: Math.max(...top, ...bottom),
    south: Math.min(...top, ...bottom),
  }
}

/**
 * Creates the globe map in `container` on mount and removes it on unmount.
 * The basemap is themed on every style load; on desktop the camera is
 * padded so the globe centres left of the drawer zone.
 * The settled camera (debounced `moveend`) is written to the map store.
 * Child components get the map through {@link useMapContext}.
 */
export function useMap(container: Readonly<ShallowRef<HTMLElement | null>>): MapContext {
  const store = useMapStore()
  const map = shallowRef<mapboxgl.Map | null>(null)
  const styleReady = shallowRef(false)
  const isDesktop = useIsDesktop()

  /** On desktop the camera centres in the map area left of the drawer zone. */
  const padding = (): mapboxgl.PaddingOptions => ({
    top: 0,
    bottom: 0,
    left: 0,
    right: isDesktop.value ? config.drawerZonePx : 0,
  })

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
    instance.setPadding(padding())
    instance.on('style.load', () => {
      applyBasemapTheme(instance)
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

  watch(isDesktop, () => {
    map.value?.setPadding(padding())
  })

  // After children have unmounted, so layer components can clean up first.
  onUnmounted(() => {
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
