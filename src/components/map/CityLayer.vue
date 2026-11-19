<template>
  <span hidden />
</template>

<script setup lang="ts">
import type { ExpressionSpecification, FilterSpecification, GeoJSONSource, SymbolLayerSpecification } from 'mapbox-gl'
import type mapboxgl from 'mapbox-gl'
import { computed, onBeforeUnmount, watch } from 'vue'
import { useForecastTime } from '@/composables/useForecastTime'
import { useFormat } from '@/composables/useFormat'
import { useIsDesktop } from '@/composables/useLayout'
import { CITY_LAYER_IDS, SELECTED_POINT_LAYER_IDS } from '@/composables/mapLayers'
import { useMapContext } from '@/composables/useMap'
import { PILL_NONE_IMAGE, PILL_SAVED_IMAGE, PILL_SELECTED_IMAGE, loadMapImages } from '@/composables/useMapImages'
import { useViewportWeather } from '@/composables/useViewportWeather'
import { config } from '@/config'
import { MAP_COLORS } from '@/domain/colorRamps'
import { buildCityFeatures } from '@/domain/mapFeatures'
import { cityIdOf } from '@/domain/places'
import { useMapStore } from '@/stores/mapStore'
import { usePlacesStore } from '@/stores/placesStore'

type LabelKind = 'normal' | 'saved' | 'selected'

const SOURCE_ID = 'cities'
const LAYER_IDS: Readonly<Record<LabelKind, string>> = CITY_LAYER_IDS
const NAME_SCALE = 0.75
const LETTER_SPACING_EM = -0.01
const HALO_WIDTH_PX = 1.5
const HALO_BLUR_PX = 0.5
/** Pill padding around the text: top, right, bottom, left. */
const PILL_PADDING: [number, number, number, number] = [2, 9, 2, 2]
/** Lifts the selected pill so its pointer tip sits on the city. */
const SELECTED_OFFSET_EM: [number, number] = [0, -0.9]
const NO_ID = -1

const { map, styleReady } = useMapContext()
const { cities, weather, loading } = useViewportWeather()
const store = useMapStore()
const places = usePlacesStore()
const isDesktop = useIsDesktop()
const { instantSec } = useForecastTime()
const { layerLabel } = useFormat()

const features = computed(() => buildCityFeatures(cities.value, weather.value, {
  layer: store.activeLayer,
  instantSec: instantSec.value,
  label: layerLabel,
  loading: loading.value,
}))

const savedIds = computed(() => places.collection.flatMap(place => cityIdOf(place.key) ?? []))
const selectedId = computed(() => (places.selected ? cityIdOf(places.selected.key) : null) ?? NO_ID)

/** Saved and selected labels are separate layers: layout properties can't read feature state. */
function filterFor(kind: LabelKind): FilterSpecification {
  const id: ExpressionSpecification = ['get', 'id']
  switch (kind) {
    case 'normal':
      return ['!', ['in', id, ['literal', [...savedIds.value, selectedId.value]]]]
    case 'saved':
      return ['all', ['in', id, ['literal', savedIds.value]], ['!=', id, selectedId.value]]
    case 'selected':
      return ['==', id, selectedId.value]
  }
}

const icon: ExpressionSpecification = ['image', ['get', 'icon']]
const textField: ExpressionSpecification = [
  'step', ['zoom'],
  ['format', icon, {}, ' ', {}, ['get', 'label'], {}],
  config.cityNameMinZoom,
  ['format', icon, {}, ' ', {}, ['get', 'label'], {}, '\n', {}, ['get', 'name'], { 'font-scale': NAME_SCALE }],
]

function layerSpec(kind: LabelKind): SymbolLayerSpecification {
  const selected = kind === 'selected'
  return {
    id: LAYER_IDS[kind],
    type: 'symbol',
    source: SOURCE_ID,
    filter: filterFor(kind),
    layout: {
      'symbol-sort-key': ['*', -1, ['get', 'population']],
      'text-field': textField,
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
      'text-size': isDesktop.value ? config.labelTextSizeDesktop : config.labelTextSizeMobile,
      'text-letter-spacing': LETTER_SPACING_EM,
      'icon-image': { normal: PILL_NONE_IMAGE, saved: PILL_SAVED_IMAGE, selected: PILL_SELECTED_IMAGE }[kind],
      'icon-text-fit': 'both',
      'icon-text-fit-padding': PILL_PADDING,
      ...(selected
        ? { 'text-anchor': 'bottom', 'text-offset': SELECTED_OFFSET_EM, 'text-allow-overlap': true, 'icon-allow-overlap': true }
        : {}),
    },
    paint: kind === 'normal'
      ? {
          'text-color': MAP_COLORS.label,
          'text-halo-color': MAP_COLORS.labelHalo,
          'text-halo-width': HALO_WIDTH_PX,
          'text-halo-blur': HALO_BLUR_PX,
        }
      : { 'text-color': selected ? MAP_COLORS.labelOnSelected : MAP_COLORS.labelOnSaved },
  }
}

const KINDS: readonly LabelKind[] = ['normal', 'saved', 'selected']

async function install(instance: mapboxgl.Map): Promise<void> {
  await loadMapImages(instance)
  if (!instance.getSource(SOURCE_ID)) {
    instance.addSource(SOURCE_ID, { type: 'geojson', data: features.value })
  }
  // Below the clicked-point marker, if it is already there.
  const beforeId = instance.getLayer(SELECTED_POINT_LAYER_IDS.ring) ? SELECTED_POINT_LAYER_IDS.ring : undefined
  for (const kind of KINDS) {
    if (!instance.getLayer(LAYER_IDS[kind])) {
      instance.addLayer(layerSpec(kind), beforeId)
    }
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

watch([savedIds, selectedId], () => {
  for (const kind of KINDS) {
    if (map.value?.getLayer(LAYER_IDS[kind])) {
      map.value.setFilter(LAYER_IDS[kind], filterFor(kind))
    }
  }
})

watch(isDesktop, (desktop) => {
  for (const kind of KINDS) {
    if (map.value?.getLayer(LAYER_IDS[kind])) {
      map.value.setLayoutProperty(LAYER_IDS[kind], 'text-size', desktop ? config.labelTextSizeDesktop : config.labelTextSizeMobile)
    }
  }
})

onBeforeUnmount(() => {
  const instance = map.value
  for (const kind of KINDS) {
    if (instance?.getLayer(LAYER_IDS[kind])) {
      instance.removeLayer(LAYER_IDS[kind])
    }
  }
  if (instance?.getSource(SOURCE_ID)) {
    instance.removeSource(SOURCE_ID)
  }
})
</script>
