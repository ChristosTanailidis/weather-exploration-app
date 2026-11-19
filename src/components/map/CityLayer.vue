<template>
  <span hidden />
</template>

<script setup lang="ts">
import type { GeoJSONSource, SymbolLayerSpecification } from 'mapbox-gl'
import type mapboxgl from 'mapbox-gl'
import { computed, onBeforeUnmount, watch } from 'vue'
import { useForecastTime } from '@/composables/useForecastTime'
import { useFormat } from '@/composables/useFormat'
import { useMapContext } from '@/composables/useMap'
import { loadMapImages } from '@/composables/useMapImages'
import { useViewportWeather } from '@/composables/useViewportWeather'
import { config } from '@/config'
import { MAP_COLORS } from '@/domain/colorRamps'
import { buildCityFeatures } from '@/domain/mapFeatures'
import { useMapStore } from '@/stores/mapStore'

const SOURCE_ID = 'cities'
const LAYER_ID = 'city-weather'
const TEXT_SIZE = 12
const NAME_SCALE = 0.85
const HALO_WIDTH = 1.5
const TEXT_OFFSET_EM: [number, number] = [0, 1.1]

const { map, styleReady } = useMapContext()
const { cities, weather } = useViewportWeather()
const store = useMapStore()
const { instantSec } = useForecastTime()
const { layerLabel } = useFormat()

const features = computed(() => buildCityFeatures(cities.value, weather.value, {
  layer: store.activeLayer,
  instantSec: instantSec.value,
  label: layerLabel,
}))

const layer = (): SymbolLayerSpecification => ({
  id: LAYER_ID,
  type: 'symbol',
  source: SOURCE_ID,
  layout: {
    'symbol-sort-key': ['*', -1, ['get', 'population']],
    'icon-image': ['get', 'icon'],
    'icon-rotate': ['get', 'rotation'],
    'icon-rotation-alignment': rotationAlignment.value,
    'text-field': [
      'step', ['zoom'],
      ['get', 'label'],
      config.cityNameMinZoom,
      ['format', ['get', 'label'], {}, '\n', {}, ['get', 'name'], { 'font-scale': NAME_SCALE }],
    ],
    'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
    'text-size': TEXT_SIZE,
    'text-anchor': 'top',
    'text-offset': TEXT_OFFSET_EM,
  },
  paint: {
    'text-color': MAP_COLORS.label,
    'text-halo-color': MAP_COLORS.labelHalo,
    'text-halo-width': HALO_WIDTH,
  },
})

async function install(instance: mapboxgl.Map): Promise<void> {
  await loadMapImages(instance)
  if (!instance.getSource(SOURCE_ID)) {
    instance.addSource(SOURCE_ID, { type: 'geojson', data: features.value })
  }
  if (!instance.getLayer(LAYER_ID)) {
    instance.addLayer(layer())
  }
}

watch(styleReady, (ready) => {
  if (ready && map.value) {
    install(map.value).catch((error: unknown) => console.error(error))
  }
}, { immediate: true })

watch(features, (data) => {
  map.value?.getSource<GeoJSONSource>(SOURCE_ID)?.setData(data)
})

/** Wind arrows point relative to north; weather icons stay upright on screen. */
const rotationAlignment = computed(() => (store.activeLayer === 'wind' ? 'map' : 'viewport'))

watch(rotationAlignment, (alignment) => {
  if (map.value?.getLayer(LAYER_ID)) {
    map.value.setLayoutProperty(LAYER_ID, 'icon-rotation-alignment', alignment)
  }
})

onBeforeUnmount(() => {
  const instance = map.value
  if (instance?.getLayer(LAYER_ID)) {
    instance.removeLayer(LAYER_ID)
  }
  if (instance?.getSource(SOURCE_ID)) {
    instance.removeSource(SOURCE_ID)
  }
})
</script>
