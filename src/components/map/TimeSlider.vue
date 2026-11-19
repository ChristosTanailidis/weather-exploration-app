<template>
  <section
    class="glass rounded-xl"
    :class="isDesktop ? 'flex h-24 gap-5 pt-3 pr-5.5 pb-2.5 pl-4.5' : 'h-25 px-4 pt-3 pb-2'"
    :aria-label="t('time.label')"
  >
    <template v-if="isDesktop">
      <div class="flex w-33 flex-none flex-col justify-center gap-0.5 border-r border-border">
        <span class="text-caption font-semibold tracking-[0.08em] text-text-secondary uppercase">{{ dayText }}</span>
        <output
          :for="inputId"
          class="font-display text-readout"
        >{{ timeText }}</output>
        <span :class="badgeClass">{{ relText }}</span>
      </div>
      <div class="relative flex-1">
        <div class="absolute inset-x-0 top-0 h-4">
          <span
            v-for="label in dayLabels"
            :key="label.index"
            class="absolute text-caption font-semibold whitespace-nowrap text-control"
            :class="label.index > 0 && 'translate-x-1.5'"
            :style="{ left: label.left }"
          >{{ label.text }}</span>
        </div>
        <TimeTrack
          v-model="timeIndex"
          class="absolute! inset-x-0 top-5.5"
          v-bind="trackProps"
        />
        <div class="absolute inset-x-0 bottom-0 h-3.5">
          <span
            v-for="label in hourLabels"
            :key="label.index"
            class="absolute -translate-x-1/2 text-micro font-normal text-text-tertiary"
            :style="{ left: label.left }"
          >{{ label.text }}</span>
        </div>
      </div>
    </template>
    <template v-else>
      <div class="flex h-6.5 items-center gap-2">
        <output
          :for="inputId"
          class="font-display text-[20px] font-medium"
        >{{ dayText }} {{ timeText }}</output>
        <span :class="badgeClass">{{ relText }}</span>
      </div>
      <TimeTrack
        v-model="timeIndex"
        class="mt-1"
        v-bind="trackProps"
      />
      <div class="relative mt-1 h-3.5">
        <span
          v-for="label in dayLabels"
          :key="label.index"
          class="absolute text-micro font-semibold whitespace-nowrap text-control"
          :class="label.index > 0 && 'translate-x-1.5'"
          :style="{ left: label.left }"
        >{{ label.text }}</span>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import TimeTrack from '@/components/map/TimeTrack.vue'
import { useForecastTime } from '@/composables/useForecastTime'
import { useIsDesktop } from '@/composables/useLayout'
import { config } from '@/config'
import { HOUR_SEC } from '@/domain/mapFeatures'
import { nightRanges } from '@/domain/sun'
import { dayStartIndices } from '@/domain/time'
import { useMapStore } from '@/stores/mapStore'

const MS_PER_SEC = 1000
const PERCENT = 100
const HOURS_BETWEEN_LABELS = 6

const { t, d } = useI18n()
const store = useMapStore()
const isDesktop = useIsDesktop()
const { nowHourSec, instantSec } = useForecastTime()
const inputId = useId()
const lastIndex = config.forecastHours - 1

const timeIndex = computed<number>({
  get: () => store.timeIndex,
  set: index => store.setTimeIndex(index),
})

const toDate = (sec: number): Date => new Date(sec * MS_PER_SEC)
const slotDate = (index: number): Date => toDate(nowHourSec.value + index * HOUR_SEC)
const left = (index: number): string => `${(index / lastIndex) * PERCENT}%`

const dayText = computed(() => d(toDate(instantSec.value), 'dayMonth'))
const timeText = computed(() => d(toDate(instantSec.value), 'hourMinute'))
const relText = computed(() => (timeIndex.value === 0 ? t('time.now') : t('time.ahead', { n: timeIndex.value })))
const badgeClass = computed(() => [
  'self-start rounded-full px-2 py-0.5 text-caption font-semibold whitespace-nowrap',
  timeIndex.value === 0 ? 'bg-accent text-text-on-accent' : 'bg-surface-elevated text-text-secondary',
])
const valueText = computed(() => {
  const time = d(toDate(instantSec.value), 'weekdayHourMinute')
  return timeIndex.value === 0
    ? t('time.valueNow', { time })
    : t('time.valueAhead', { time, n: timeIndex.value }, timeIndex.value)
})

const dayStarts = computed(() => dayStartIndices(nowHourSec.value, config.forecastHours, sec => toDate(sec).getDate()))
const sixHourly = computed(() => Array.from({ length: config.forecastHours }, (_, i) => i)
  .filter(i => slotDate(i).getHours() % HOURS_BETWEEN_LABELS === 0))

/** Today's label is dropped when the next day starts too close to fit both. */
const MIN_HOURS_BEFORE_NEXT_DAY = { desktop: 4, mobile: 8 }

const dayLabels = computed(() => {
  const firstStart = dayStarts.value[0] ?? config.forecastHours
  const minHours = isDesktop.value ? MIN_HOURS_BEFORE_NEXT_DAY.desktop : MIN_HOURS_BEFORE_NEXT_DAY.mobile
  const indices = firstStart >= minHours ? [0, ...dayStarts.value] : dayStarts.value
  return indices.map(index => ({
    index,
    left: left(index),
    text: d(slotDate(index), 'weekdayDay'),
  }))
})
const hourLabels = computed(() => sixHourly.value
  .filter(index => !dayStarts.value.includes(index))
  .map(index => ({ index, left: left(index), text: d(slotDate(index), 'hourMinute') })))

/** Night hours at the centre of the map. */
const nights = computed(() => nightRanges(store.view, nowHourSec.value, config.forecastHours))

const trackProps = computed(() => ({
  inputId,
  nights: nights.value,
  dayStarts: dayStarts.value,
  sixHourly: sixHourly.value,
  valueText: valueText.value,
}))
</script>
