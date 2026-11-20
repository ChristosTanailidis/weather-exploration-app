<template>
  <section
    :aria-label="t('panel.sevenDays')"
    class="mx-4 mt-5 lg:mx-5"
  >
    <div class="mb-1 flex items-baseline justify-between">
      <h3 class="text-[15px] font-semibold">
        {{ t('panel.sevenDays') }}
      </h3>
      <span class="text-caption font-normal text-text-tertiary">{{ t('panel.weeklyScale') }}</span>
    </div>
    <ul :aria-label="t('panel.dayList')">
      <li
        v-for="(row, i) in rows"
        :key="row.timeSec"
        class="grid h-11 grid-cols-[56px_30px_48px_30px_minmax(0,1fr)_30px] items-center gap-x-2.5"
        :class="i > 0 && 'border-t border-border/60'"
      >
        <span
          class="text-body-s"
          :class="i === 0 ? 'font-semibold' : 'font-medium'"
        >{{ i === 0 ? t('panel.today') : local.weekday(localClock(row.timeSec, utcOffsetSec)) }}</span>
        <WeatherIcon
          :icon="describeWeather(row.weatherCode).icon"
          :alt="t(describeWeather(row.weatherCode).labelKey)"
        />
        <span
          class="flex items-center gap-0.75 text-label text-info tabular-nums"
          :aria-label="t('panel.rainChance', { value: row.precipProbMaxPct ?? 0 })"
        ><AppIcon
          name="precipitation"
          :size="12"
        />{{ row.precipProbMaxPct ?? 0 }}%</span>
        <span class="text-right text-body-s font-normal text-text-secondary tabular-nums">{{ temp(row.tempMinC, true) }}</span>
        <span
          class="relative h-1.5 rounded-[3px] bg-text-secondary/12"
          role="img"
          :aria-label="t('panel.dayRange', { min: temp(row.tempMinC, true), max: temp(row.tempMaxC, true) })"
        >
          <span
            class="absolute inset-y-0 rounded-[3px]"
            :style="{ left: `${row.barLeftPct}%`, width: `${row.barWidthPct}%`, background: barGradient(row) }"
          >
            <span
              v-if="row.nowPct !== null"
              class="absolute top-1/2 size-2 -translate-1/2 rounded-full bg-text-primary ring-2 ring-surface-panel-solid"
              :style="{ left: `${row.nowPct}%` }"
            />
          </span>
        </span>
        <span class="text-body-s font-semibold tabular-nums">{{ temp(row.tempMaxC, true) }}</span>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppIcon from '@/components/ui/AppIcon.vue'
import WeatherIcon from '@/components/ui/WeatherIcon.vue'
import { useFormat } from '@/composables/useFormat'
import { COLOR_RAMPS, colorAt } from '@/domain/colorRamps'
import { localClock } from '@/domain/forecastView'
import type { DayRow } from '@/domain/forecastView'
import { describeWeather } from '@/domain/wmo'

const { rows, utcOffsetSec } = defineProps<{
  rows: readonly DayRow[]
  utcOffsetSec: number
}>()

const { t } = useI18n()
const { temp, local } = useFormat()

/** The bar runs through the temperature ramp from the day's low to its high. */
const barGradient = (row: DayRow): string => (row.tempMinC === null || row.tempMaxC === null
  ? 'transparent'
  : `linear-gradient(90deg, ${colorAt(COLOR_RAMPS.temperature, row.tempMinC)}, ${colorAt(COLOR_RAMPS.temperature, row.tempMaxC)})`)
</script>
