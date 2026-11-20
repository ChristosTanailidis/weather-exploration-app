<template>
  <span hidden />
</template>

<script setup lang="ts">
import type { GeoJSONSource, MapMouseEvent } from 'mapbox-gl'
import type mapboxgl from 'mapbox-gl'
import { computed, onBeforeUnmount, watch } from 'vue'
import { CITY_LAYER_IDS, SELECTED_POINT_LAYER_IDS } from '@/composables/mapLayers'
import { useCities } from '@/composables/useCities'
import { useMapContext } from '@/composables/useMap'
import { config } from '@/config'
import { MAP_COLORS } from '@/domain/colorRamps'
import { placeFromCity, placeFromPoint } from '@/domain/places'
import { usePlacesStore } from '@/stores/placesStore'

const SOURCE_ID = 'selected-point'
const RING_RADIUS_PX = 9
const RING_STROKE_PX = 3
const DOT_RADIUS_PX = 3

const { map, styleReady } = useMapContext()
const { cities } = useCities()
const places = usePlacesStore()
const cityLayers = Object.values(CITY_LAYER_IDS)

/** Marker for a selected place that has no label of its own (not a city, not a saved pin). */
const data = computed(() => {
  const place = places.selected
  return {
    type: 'FeatureCollection' as const,
    features: place && place.kind !== 'city' && !places.isSaved(place.key)
      ? [{ type: 'Feature' as const, properties: {}, geometry: { type: 'Point' as const, coordinates: [place.lon, place.lat] } }]
      : [],
  }
})

function install(instance: mapboxgl.Map): void {
  if (!instance.getSource(SOURCE_ID)) {
    instance.addSource(SOURCE_ID, { type: 'geojson', data: data.value })
  }
  if (!instance.getLayer(SELECTED_POINT_LAYER_IDS.ring)) {
    instance.addLayer({
      id: SELECTED_POINT_LAYER_IDS.ring,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-radius': RING_RADIUS_PX,
        'circle-color': MAP_COLORS.pointFill,
        'circle-stroke-width': RING_STROKE_PX,
        'circle-stroke-color': MAP_COLORS.pointStroke,
      },
    })
    instance.addLayer({
      id: SELECTED_POINT_LAYER_IDS.dot,
      type: 'circle',
      source: SOURCE_ID,
      paint: { 'circle-radius': DOT_RADIUS_PX, 'circle-color': MAP_COLORS.pointCentre },
    })
  }
}

/** A click on a city label selects that city; anywhere else selects the point. No requests. */
function onClick(event: MapMouseEvent): void {
  const instance = map.value
  if (!instance) {
    return
  }
  const layers = cityLayers.filter(id => instance.getLayer(id))
  const feature = layers.length > 0 ? instance.queryRenderedFeatures(event.point, { layers })[0] : undefined
  // City features carry the dataset id as their feature id; pins carry the place key.
  const { id, properties } = (feature ?? {}) as { id?: unknown, properties?: Record<string, unknown> }
  const pinKey = properties?.key
  const pinned = typeof pinKey === 'string'
    ? [...places.listPlaces, places.selected].find(place => place?.key === pinKey)
    : undefined
  if (pinned) {
    places.select(pinned)
    return
  }
  const city = typeof id === 'number' ? cities.value.find(c => c.id === id) : undefined
  places.select(city
    ? placeFromCity(city)
    : placeFromPoint({ lat: event.lngLat.lat, lon: event.lngLat.lng }, cities.value, {
        precision: config.coordPrecision,
        maxKm: config.nearestCityMaxKm,
      }))
}

const setPointer = (): void => {
  map.value?.getCanvas().style.setProperty('cursor', 'pointer')
}
const clearPointer = (): void => {
  map.value?.getCanvas().style.removeProperty('cursor')
}

watch(map, (instance, previous) => {
  previous?.off('click', onClick)
  if (instance) {
    instance.on('click', onClick)
    instance.on('mouseenter', cityLayers, setPointer)
    instance.on('mouseleave', cityLayers, clearPointer)
  }
}, { immediate: true })

watch(styleReady, (ready) => {
  if (ready && map.value) {
    install(map.value)
  }
}, { immediate: true })

watch(data, (next) => {
  map.value?.getSource<GeoJSONSource>(SOURCE_ID)?.setData(next)
})

onBeforeUnmount(() => {
  const instance = map.value
  instance?.off('click', onClick)
  instance?.off('mouseenter', cityLayers, setPointer)
  instance?.off('mouseleave', cityLayers, clearPointer)
  for (const id of Object.values(SELECTED_POINT_LAYER_IDS)) {
    if (instance?.getLayer(id)) {
      instance.removeLayer(id)
    }
  }
  if (instance?.getSource(SOURCE_ID)) {
    instance.removeSource(SOURCE_ID)
  }
})
</script>
