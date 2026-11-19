<template>
  <div
    v-if="isDesktop"
    class="glass rounded-lg px-3.5 pt-3 pb-2.5"
  >
    <div class="mb-2 flex items-center">
      <span class="text-label">{{ t(`layers.${store.activeLayer}`) }}</span>
      <span class="mr-auto ml-1.5 text-caption text-text-secondary">{{ unit }}</span>
      <UnitsToggle :layer="store.activeLayer" />
    </div>
    <div
      class="h-2.5 rounded-[5px]"
      :style="{ background: gradient }"
      aria-hidden="true"
    />
    <div class="relative mt-1.5 h-4">
      <span
        v-for="tick in ticks"
        :key="tick.value"
        class="tick text-micro"
        :style="{ left: `${tick.positionPct}%` }"
      >{{ tick.label }}</span>
    </div>
  </div>
  <div
    v-else
    class="flex items-end gap-2"
  >
    <div class="glass flex-1 rounded-lg px-3 pt-2.5 pb-2">
      <div class="mb-1.5 flex items-baseline justify-between">
        <span class="text-caption font-semibold">{{ t(`layers.${store.activeLayer}`) }}</span>
        <span class="text-micro text-text-secondary">{{ unit }}</span>
      </div>
      <div
        class="h-2 rounded-xs"
        :style="{ background: gradient }"
        aria-hidden="true"
      />
      <div class="relative mt-1 h-3.5">
        <span
          v-for="tick in ticks"
          :key="tick.value"
          class="tick text-[10.5px]"
          :style="{ left: `${tick.positionPct}%` }"
        >{{ tick.label }}</span>
      </div>
    </div>
    <UnitsToggle
      :layer="store.activeLayer"
      vertical
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import UnitsToggle from '@/components/map/UnitsToggle.vue'
import { useIsDesktop } from '@/composables/useLayout'
import { COLOR_RAMPS, legendTicks, toCssGradient } from '@/domain/colorRamps'
import type { LayerId, UnitSystem } from '@/domain/types'
import { displayPrecip, displaySpeed, displayTemp } from '@/domain/units'
import { useMapStore } from '@/stores/mapStore'
import { useSettingsStore } from '@/stores/settingsStore'

const { t } = useI18n()
const store = useMapStore()
const settings = useSettingsStore()
const isDesktop = useIsDesktop()

const UNIT_KEYS = {
  temperature: { metric: 'celsius', imperial: 'fahrenheit' },
  precipitation: { metric: 'mmPerHour', imperial: 'inPerHour' },
  wind: { metric: 'kmh', imperial: 'mph' },
  clouds: { metric: 'cover', imperial: 'cover' },
} as const satisfies Record<LayerId, Record<UnitSystem, string>>

function tickLabel(value: number, layer: LayerId, system: UnitSystem): string {
  switch (layer) {
    case 'temperature':
      return t('legend.tick.degrees', { value: displayTemp(value, system) ?? value })
    case 'precipitation':
      return t('legend.tick.plain', { value: displayPrecip(value, system) ?? value })
    case 'wind':
      return t('legend.tick.plain', { value: displaySpeed(value, system) ?? value })
    case 'clouds':
      return t('legend.tick.percent', { value })
  }
}

const ramp = computed(() => COLOR_RAMPS[store.activeLayer])
const gradient = computed(() => toCssGradient(ramp.value))
const unit = computed(() => t(`legend.unit.${UNIT_KEYS[store.activeLayer][settings.units]}`))
const ticks = computed(() => legendTicks(ramp.value).map(tick => ({
  ...tick,
  label: tickLabel(tick.value, store.activeLayer, settings.units),
})))
</script>

<style scoped>
@reference "@/assets/main.css";

.tick {
  @apply absolute -translate-x-1/2 font-medium text-text-secondary tabular-nums first:translate-x-0 last:-translate-x-full;
}
</style>
