<template>
  <div class="relative h-full w-full">
    <div
      ref="container"
      class="h-full w-full"
      role="region"
      :aria-label="t('map.label')"
    />
    <slot v-if="map" />
  </div>
</template>

<script setup lang="ts">
import 'mapbox-gl/dist/mapbox-gl.css'
import { useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMap } from '@/composables/useMap'

const { t } = useI18n()
const container = useTemplateRef<HTMLDivElement>('container')
const { map } = useMap(container)
</script>
