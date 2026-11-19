<template>
  <figure
    class="w-64 max-w-full rounded-md border border-line bg-surface p-2 shadow-sm"
    :aria-label="t('legend.label')"
  >
    <figcaption class="mb-1 text-xs font-medium text-ink">
      {{ title }}
    </figcaption>
    <div
      class="h-2.5 rounded-sm border border-line"
      :style="{ background: gradient }"
    />
    <div class="relative mt-1 h-4 text-xs text-ink-muted">
      <span
        v-for="tick in ticks"
        :key="tick.value"
        class="absolute -translate-x-1/2 tabular-nums first:translate-x-0 last:-translate-x-full"
        :style="{ left: `${tick.positionPct}%` }"
      >{{ tick.label }}</span>
    </div>
  </figure>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { config } from '@/config'
import { COLOR_RAMPS, legendTicks, toCssGradient } from '@/domain/colorRamps'
import type { LayerId, UnitSystem } from '@/domain/types'
import { UNIT_SETS, displayPrecip, displaySpeed, displayTemp } from '@/domain/units'
import { useMapStore } from '@/stores/mapStore'
import { useSettingsStore } from '@/stores/settingsStore'

const { t } = useI18n()
const store = useMapStore()
const settings = useSettingsStore()

function unitOf(layer: LayerId, system: UnitSystem): string {
  const units = UNIT_SETS[system]
  const unit = { temperature: units.temp, precipitation: units.precip, wind: units.speed, clouds: 'percent' as const }[layer]
  return t(`units.symbols.${unit}`)
}

function display(value: number, layer: LayerId, system: UnitSystem): number | null {
  switch (layer) {
    case 'temperature':
      return displayTemp(value, system)
    case 'precipitation':
      return displayPrecip(value, system)
    case 'wind':
      return displaySpeed(value, system)
    case 'clouds':
      return value
  }
}

const ramp = computed(() => COLOR_RAMPS[store.activeLayer])
const gradient = computed(() => toCssGradient(ramp.value))
const title = computed(() => t(`legend.${store.activeLayer}`, { unit: unitOf(store.activeLayer, settings.units) }))
const ticks = computed(() => legendTicks(ramp.value, config.legendMinTickGapPct).map(tick => ({
  ...tick,
  label: String(display(tick.value, store.activeLayer, settings.units) ?? ''),
})))
</script>
