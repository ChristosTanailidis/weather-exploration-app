<template>
  <fieldset class="panel flex flex-wrap gap-1 p-1">
    <legend class="sr-only">
      {{ t('layers.label') }}
    </legend>
    <label
      v-for="layer in LAYER_IDS"
      :key="layer"
      class="option"
      :class="{ 'option-active': activeLayer === layer }"
    >
      <input
        v-model="activeLayer"
        class="sr-only"
        type="radio"
        name="map-layer"
        :value="layer"
      >
      {{ t(`layers.${layer}`) }}
    </label>
  </fieldset>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { LAYER_IDS } from '@/domain/types'
import type { LayerId } from '@/domain/types'
import { useMapStore } from '@/stores/mapStore'

const { t } = useI18n()
const store = useMapStore()

const activeLayer = computed<LayerId>({
  get: () => store.activeLayer,
  set: layer => store.setLayer(layer),
})
</script>

<style scoped>
@reference "@/assets/main.css";

.panel {
  @apply rounded-md border border-line bg-surface shadow-sm;
}

.option {
  @apply cursor-pointer rounded px-3 py-1.5 text-sm text-ink-muted;
}

.option:has(input:focus-visible) {
  @apply outline-2 outline-offset-1 outline-accent;
}

.option-active {
  @apply bg-accent text-surface;
}
</style>
