<template>
  <section
    class="mx-auto w-full max-w-2xl rounded-md border border-line bg-surface px-3 py-2 shadow-sm"
    :aria-label="t('time.label')"
  >
    <div class="mb-1 flex items-center justify-between gap-2 text-sm">
      <output
        :for="inputId"
        class="font-medium tabular-nums"
      >{{ selectedText }}</output>
      <button
        type="button"
        class="rounded px-2 py-0.5 text-ink-muted underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-accent disabled:invisible"
        :disabled="timeIndex === 0"
        @click="timeIndex = 0"
      >
        {{ t('time.backToNow') }}
      </button>
    </div>
    <input
      :id="inputId"
      v-model.number="timeIndex"
      class="w-full accent-accent"
      type="range"
      min="0"
      :max="lastIndex"
      step="1"
      :aria-label="t('time.label')"
      :aria-valuetext="selectedText"
    >
    <div
      class="relative h-4 text-xs text-ink-muted"
      aria-hidden="true"
    >
      <span class="absolute left-0">{{ t('time.now') }}</span>
      <span
        v-for="mark in dayMarks"
        :key="mark.index"
        class="absolute -translate-x-1/2 border-l border-line pl-1"
        :style="{ left: `${mark.positionPct}%` }"
      >{{ mark.label }}</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { useForecastTime } from '@/composables/useForecastTime'
import { config } from '@/config'
import { HOUR_SEC } from '@/domain/mapFeatures'
import { dayStartIndices } from '@/domain/time'
import { useMapStore } from '@/stores/mapStore'

const MS_PER_SEC = 1000
const PERCENT = 100

const { t, d } = useI18n()
const store = useMapStore()
const { nowHourSec, instantSec } = useForecastTime()
const inputId = useId()
const lastIndex = config.forecastHours - 1

const timeIndex = computed<number>({
  get: () => store.timeIndex,
  set: index => store.setTimeIndex(index),
})

const toDate = (sec: number): Date => new Date(sec * MS_PER_SEC)

const selectedText = computed(() => {
  const time = d(toDate(instantSec.value), 'weekdayHour')
  return timeIndex.value === 0 ? t('time.nowAt', { time }) : t('time.selected', { time, hours: timeIndex.value })
})

const dayMarks = computed(() =>
  dayStartIndices(nowHourSec.value, config.forecastHours, sec => toDate(sec).getDate()).map(index => ({
    index,
    positionPct: (index / lastIndex) * PERCENT,
    label: d(toDate(nowHourSec.value + index * HOUR_SEC), 'weekday'),
  })))
</script>
