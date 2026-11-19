<template>
  <div class="relative h-7.5">
    <div
      v-for="night in nights"
      :key="night.start"
      class="absolute top-0 h-7.5 rounded-[6px] bg-night"
      :style="{ left: pct(night.start), width: `calc(${pct(night.end)} - ${pct(night.start)})` }"
    />
    <div class="absolute inset-x-0 top-3.5 h-0.5 bg-track" />
    <div
      v-for="tick in ticks"
      :key="tick.index"
      class="absolute w-px"
      :class="tick.kind"
      :style="{ left: pct(tick.index) }"
    />
    <div class="absolute top-1 left-0 h-5.5 w-0.5 bg-accent" />
    <input
      :id="inputId"
      v-model.number="index"
      class="time-range absolute -top-1.75 -left-2.75 h-11 w-[calc(100%+22px)]"
      type="range"
      min="0"
      :max="lastIndex"
      step="1"
      :aria-label="t('time.label')"
      :aria-valuetext="valueText"
      @keydown="onKeydown"
    >
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { config } from '@/config'
import type { IndexRange } from '@/domain/sun'

const { inputId, nights, dayStarts, sixHourly, valueText } = defineProps<{
  inputId: string
  nights: readonly IndexRange[]
  dayStarts: readonly number[]
  /** Indices of local 00/06/12/18 h. */
  sixHourly: readonly number[]
  valueText: string
}>()
const index = defineModel<number>({ required: true })

const { t } = useI18n()
const PERCENT = 100
const HOURS_PER_DAY = 24
const SHIFT_STEP_HOURS = 6
const lastIndex = config.forecastHours - 1

const pct = (i: number): string => `${(i / lastIndex) * PERCENT}%`

const ticks = computed(() => Array.from({ length: config.forecastHours }, (_, i) => ({
  index: i,
  kind: dayStarts.includes(i) ? 'tick-day' : sixHourly.includes(i) ? 'tick-major' : 'tick-minor',
})))

const clamp = (value: number): number => Math.min(lastIndex, Math.max(0, value))

/** Arrows move 1 h (native), Shift + arrows 6 h, Page Up/Down a day, Home now, End the last hour. */
function onKeydown(event: KeyboardEvent): void {
  const direction = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[event.key]
  let next: number | undefined
  if (direction !== undefined && event.shiftKey) {
    next = index.value + direction * SHIFT_STEP_HOURS
  }
  else if (event.key === 'PageUp') {
    next = index.value + HOURS_PER_DAY
  }
  else if (event.key === 'PageDown') {
    next = index.value - HOURS_PER_DAY
  }
  else if (event.key === 'Home') {
    next = 0
  }
  else if (event.key === 'End') {
    next = lastIndex
  }
  if (next !== undefined) {
    event.preventDefault()
    index.value = clamp(next)
  }
}
</script>

<style scoped>
@reference "@/assets/main.css";

.tick-minor {
  @apply top-3 h-1.5 bg-tick;
}

.tick-major {
  @apply top-2.25 h-3 bg-tick;
}

.tick-day {
  @apply top-1 h-5.5 bg-tick-strong;
}
</style>
