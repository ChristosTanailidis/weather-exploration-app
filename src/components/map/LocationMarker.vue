<template>
  <div
    v-show="places.currentLocation"
    ref="element"
    class="relative size-4"
    :aria-label="t('location.youAreHere')"
    role="img"
  >
    <span class="absolute inset-0 animate-pulse-ring rounded-full bg-location" />
    <span class="absolute inset-0 rounded-full border-[3px] border-white bg-location shadow-float" />
  </div>
</template>

<script setup lang="ts">
import mapboxgl from 'mapbox-gl'
import { onBeforeUnmount, shallowRef, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMapContext } from '@/composables/useMap'
import { usePlacesStore } from '@/stores/placesStore'

const { t } = useI18n()
const { map } = useMapContext()
const places = usePlacesStore()
const element = useTemplateRef<HTMLDivElement>('element')
const marker = shallowRef<mapboxgl.Marker | null>(null)

watch([() => places.currentLocation, map, element], ([place, instance, el]) => {
  if (!place || !instance || !el) {
    marker.value?.remove()
    marker.value = null
    return
  }
  marker.value ??= new mapboxgl.Marker({ element: el })
  marker.value.setLngLat([place.lon, place.lat]).addTo(instance)
}, { immediate: true })

onBeforeUnmount(() => marker.value?.remove())
</script>
