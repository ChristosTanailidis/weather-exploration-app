<template>
  <fieldset class="flex gap-1.5 overflow-x-auto lg:glass lg:gap-0.5 lg:overflow-visible lg:rounded-lg lg:p-1">
    <legend class="sr-only">
      {{ t('layers.label') }}
    </legend>
    <label
      v-for="layer in LAYER_IDS"
      :key="layer"
      class="option"
      :class="activeLayer === layer ? 'option-active' : 'option-idle'"
      :title="t(`layers.${layer}`)"
    >
      <input
        v-model="activeLayer"
        class="sr-only"
        type="radio"
        name="map-layer"
        :value="layer"
        :aria-label="t(`layers.${layer}`)"
      >
      <AppIcon
        :name="layer"
        :size="18"
      />
      <span class="lg:hidden">{{ t(`layers.chip.${layer}`) }}</span>
      <span class="hidden min-[1360px]:inline">{{ t(`layers.${layer}`) }}</span>
      <span class="hidden min-[1180px]:max-[1359px]:inline">{{ t(`layers.short.${layer}`) }}</span>
    </label>
  </fieldset>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppIcon from '@/components/ui/AppIcon.vue'
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

.option {
  @apply glass flex h-10 flex-none cursor-pointer items-center gap-2 rounded-full px-3.5 text-body-s font-semibold whitespace-nowrap;
  @apply lg:rounded-md lg:border-transparent lg:bg-transparent lg:shadow-none lg:backdrop-blur-none;
}

.option:has(input:focus-visible) {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.option-idle {
  @apply text-control-muted hover:text-text-primary;
}

.option-active {
  @apply bg-text-primary text-text-inverse lg:bg-text-primary;
}
</style>
