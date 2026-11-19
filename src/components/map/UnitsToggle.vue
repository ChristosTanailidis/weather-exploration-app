<template>
  <div
    role="group"
    :aria-label="t('units.label')"
    class="flex gap-0.5"
    :class="vertical ? 'glass flex-col rounded-lg p-1' : 'rounded-sm bg-scrim p-0.5'"
  >
    <button
      v-for="option in options"
      :key="option.system"
      type="button"
      class="text-label"
      :class="[vertical ? 'h-9 w-11 rounded-md' : 'h-7 w-10 rounded-[6px]', option.active ? 'bg-text-primary text-text-inverse' : 'text-control-muted hover:text-text-primary']"
      :aria-pressed="option.active"
      @click="settings.setUnits(option.system)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { LayerId, UnitSystem } from '@/domain/types'
import { useSettingsStore } from '@/stores/settingsStore'

const { layer, vertical = false } = defineProps<{
  layer: LayerId
  vertical?: boolean
}>()

const { t } = useI18n()
const settings = useSettingsStore()

/** The pair of units the toggle names for each layer. */
const LABELS = {
  temperature: ['celsius', 'fahrenheit'],
  precipitation: ['mmPerHour', 'inPerHour'],
  wind: ['kmh', 'mph'],
  clouds: ['celsius', 'fahrenheit'],
} as const satisfies Record<LayerId, readonly [string, string]>

const SYSTEMS: readonly UnitSystem[] = ['metric', 'imperial']

const options = computed(() => SYSTEMS.map((system, i) => ({
  system,
  active: settings.units === system,
  label: t(`legend.unit.${LABELS[layer][i] ?? 'celsius'}`),
})))
</script>
