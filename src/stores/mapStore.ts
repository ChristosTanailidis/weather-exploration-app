import { useLocalStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import type { LatLon } from '@/domain/types'

/** A camera move the map view performs: fly to a point or fit bounds. */
export type CameraRequest =
  | (LatLon & { kind: 'fly', zoom?: number, id: number })
  | { kind: 'fit', bounds: Bounds, id: number }
import { config } from '@/config'
import type { Bounds } from '@/domain/geo'
import { LAYER_IDS } from '@/domain/types'
import type { LayerId } from '@/domain/types'
import { parseView, serializeUrlState } from '@/domain/urlState'
import type { MapView } from '@/domain/urlState'

const VIEW_STORAGE_KEY = 'wxe.view'
const LAYER_STORAGE_KEY = 'wxe.layer'

const DEFAULT_LAYER: LayerId = 'temperature'

/** Map camera, visible bounds, active layer and time. Persists view and layer. */
export const useMapStore = defineStore('map', () => {
  const view = useLocalStorage<MapView>(VIEW_STORAGE_KEY, { ...config.defaultView }, {
    serializer: {
      read: raw => parseView(raw) ?? { ...config.defaultView },
      write: value => serializeUrlState({ view: value }).v ?? '',
    },
  })
  const activeLayer = useLocalStorage<LayerId>(LAYER_STORAGE_KEY, DEFAULT_LAYER, {
    serializer: {
      read: raw => LAYER_IDS.find(layer => layer === raw) ?? DEFAULT_LAYER,
      write: value => value,
    },
  })
  /** Bounds of the settled map view; `null` until the map has reported them. */
  const bounds = shallowRef<Bounds | null>(null)
  /** Hours ahead of the current hour, 0 … forecastHours - 1. */
  const timeIndex = ref(0)
  /** Latest request to move the camera; the map view animates to it. */
  const cameraRequest = shallowRef<CameraRequest | null>(null)
  let nextRequestId = 0

  function setView(next: MapView): void {
    view.value = { ...next }
  }

  function setBounds(next: Bounds | null): void {
    bounds.value = next
  }

  function setLayer(layer: LayerId): void {
    activeLayer.value = layer
  }

  function setTimeIndex(index: number): void {
    const max = config.forecastHours - 1
    timeIndex.value = Math.min(max, Math.max(0, Math.round(Number.isFinite(index) ? index : 0)))
  }

  /** Asks the map to fly to `target`, optionally zooming in to at least `zoom`. */
  function flyTo(target: LatLon, zoom?: number): void {
    nextRequestId += 1
    cameraRequest.value = { kind: 'fly', lat: target.lat, lon: target.lon, zoom, id: nextRequestId }
  }

  /** Asks the map to fit `bounds` (e.g. "My world"). */
  function fitTo(bounds: Bounds): void {
    nextRequestId += 1
    cameraRequest.value = { kind: 'fit', bounds, id: nextRequestId }
  }

  return {
    view,
    bounds,
    activeLayer,
    timeIndex,
    cameraRequest,
    setView,
    setBounds,
    setLayer,
    setTimeIndex,
    flyTo,
    fitTo,
    DEFAULT_LAYER,
  }
})
