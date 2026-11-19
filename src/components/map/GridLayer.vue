<template>
  <span hidden />
</template>

<script setup lang="ts">
import type { ExpressionSpecification, FillLayerSpecification, GeoJSONSource } from 'mapbox-gl'
import type mapboxgl from 'mapbox-gl'
import { computed, onBeforeUnmount, watch } from 'vue'
import { useForecastTime } from '@/composables/useForecastTime'
import { gridCellKey, useGridWeather } from '@/composables/useGridWeather'
import { useMapContext } from '@/composables/useMap'
import { config } from '@/config'
import { COLOR_RAMPS, toInterpolateExpression } from '@/domain/colorRamps'
import { buildGridFeatures } from '@/domain/mapFeatures'
import type { LayerId } from '@/domain/types'
import { useMapStore } from '@/stores/mapStore'

const SOURCE_ID = 'grid'
const LAYER_ID = 'weather-grid'

const { map, styleReady } = useMapContext()
const { cells, weather } = useGridWeather()
const store = useMapStore()
const { instantSec } = useForecastTime()

const features = computed(() => buildGridFeatures(cells.value, weather.value, {
  layer: store.activeLayer,
  instantSec: instantSec.value,
  keyOf: gridCellKey,
}))

const fillColor = (layer: LayerId): ExpressionSpecification =>
  toInterpolateExpression(COLOR_RAMPS[layer]) as ExpressionSpecification

/** Below the first symbol layer, so basemap labels and city symbols stay on top. */
function firstSymbolLayerId(instance: mapboxgl.Map): string | undefined {
  return instance.getStyle()?.layers?.find(layer => layer.type === 'symbol')?.id
}

function install(instance: mapboxgl.Map): void {
  if (!instance.getSource(SOURCE_ID)) {
    instance.addSource(SOURCE_ID, { type: 'geojson', data: features.value })
  }
  if (!instance.getLayer(LAYER_ID)) {
    const layer: FillLayerSpecification = {
      id: LAYER_ID,
      type: 'fill',
      source: SOURCE_ID,
      paint: {
        'fill-color': fillColor(store.activeLayer),
        'fill-opacity': config.gridOpacity,
      },
    }
    instance.addLayer(layer, firstSymbolLayerId(instance))
  }
}

watch(styleReady, (ready) => {
  if (ready && map.value) {
    install(map.value)
  }
}, { immediate: true })

watch(features, (data) => {
  map.value?.getSource<GeoJSONSource>(SOURCE_ID)?.setData(data)
})

watch(() => store.activeLayer, (layer) => {
  if (map.value?.getLayer(LAYER_ID)) {
    map.value.setPaintProperty(LAYER_ID, 'fill-color', fillColor(layer))
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
