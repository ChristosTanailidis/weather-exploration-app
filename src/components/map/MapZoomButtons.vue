<template>
  <div class="glass flex flex-col gap-0.5 rounded-lg p-1">
    <button
      type="button"
      class="map-button"
      :aria-label="t('map.zoomIn')"
      @click="map?.zoomIn()"
    >
      <AppIcon name="plus" />
    </button>
    <button
      type="button"
      class="map-button"
      :aria-label="t('map.zoomOut')"
      @click="map?.zoomOut()"
    >
      <AppIcon name="minus" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useMapContext } from '@/composables/useMap'

const { t } = useI18n()
const { map } = useMapContext()
</script>

<style scoped>
@reference "@/assets/main.css";

.map-button {
  @apply flex size-11 items-center justify-center rounded-md text-control hover:bg-surface-elevated;
}
</style>
