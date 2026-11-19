<template>
  <div class="glass flex flex-col gap-0.5 rounded-lg p-1">
    <MapButton
      :label="t('map.zoomIn')"
      @click="map?.zoomIn()"
    >
      <AppIcon name="plus" />
    </MapButton>
    <MapButton
      :label="t('map.zoomOut')"
      @click="map?.zoomOut()"
    >
      <AppIcon name="minus" />
    </MapButton>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import MapButton from '@/components/map/MapButton.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useMapContext } from '@/composables/useMap'

const { t } = useI18n()
const { map } = useMapContext()
</script>
