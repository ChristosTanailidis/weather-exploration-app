<template>
  <section
    :aria-label="t('panel.next24')"
    class="mx-4 mt-5 lg:mx-5"
  >
    <div class="mb-2.5 flex items-center justify-between">
      <h3 class="text-[15px] font-semibold">
        {{ t('panel.next24') }}
      </h3>
      <div
        class="flex gap-3 text-caption font-normal text-text-secondary"
        aria-hidden="true"
      >
        <span class="flex items-center gap-1.5"><span class="h-0.75 w-3.5 rounded-xs bg-chart-temp" />{{ t('panel.legendTemp') }}</span>
        <span class="flex items-center gap-1.5"><span class="h-2.5 w-2 rounded-xs bg-chart-rain/70" />{{ t('panel.legendRain') }}</span>
      </div>
    </div>
    <div
      class="relative mr-7.5 ml-7 h-7"
      aria-hidden="true"
    >
      <WeatherIcon
        v-for="icon in icons"
        :key="icon.index"
        :icon="icon.icon"
        :size="24"
        class="absolute top-0 -translate-x-1/2"
        :style="{ left: `${icon.leftPct}%` }"
      />
    </div>
    <!-- Sized wrapper: the chart element fills its parent (vue-echarts' own CSS). -->
    <div
      class="h-44"
      role="img"
      :aria-label="t('panel.chartLabel')"
    >
      <VChart
        :option="option"
        autoresize
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import '@/components/place/chartSetup'
import { usePreferredReducedMotion } from '@vueuse/core'
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { useI18n } from 'vue-i18n'
import WeatherIcon from '@/components/ui/WeatherIcon.vue'
import { useFormat } from '@/composables/useFormat'
import { CHART_COLORS } from '@/domain/colorRamps'
import { localClock, midnightIndices, nightSpans } from '@/domain/forecastView'
import type { PanelHour } from '@/domain/forecastView'
import { displayTemp } from '@/domain/units'
import { describeWeather } from '@/domain/wmo'
import { useSettingsStore } from '@/stores/settingsStore'

const { hours, utcOffsetSec } = defineProps<{
  hours: readonly PanelHour[]
  utcOffsetSec: number
}>()

const ICON_EVERY_HOURS = 3
const PERCENT = 100
const PROB_MAX = 100

const { t } = useI18n()
const { local } = useFormat()
const settings = useSettingsStore()
const motion = usePreferredReducedMotion()

const clock = (hour: PanelHour): string => local.clock(localClock(hour.timeSec, utcOffsetSec))

const icons = computed(() => hours
  .map((hour, index) => ({ hour, index }))
  .filter(({ index }) => index % ICON_EVERY_HOURS === 0)
  .map(({ hour, index }) => ({
    index,
    icon: describeWeather(hour.weatherCode, hour.isDay).icon,
    leftPct: (index / Math.max(1, hours.length - 1)) * PERCENT,
  })))

const option = computed(() => {
  const labels = hours.map(clock)
  const temps = hours.map(hour => displayTemp(hour.tempC, settings.units))
  const rain = hours.map(hour => hour.precipProbPct)
  const axisLabel = { color: CHART_COLORS.axisLabel, fontFamily: 'Inter Variable, Inter, sans-serif', fontSize: 11 }
  return {
    animation: motion.value !== 'reduce',
    grid: { left: 28, right: 30, top: 14, bottom: 34 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: CHART_COLORS.tooltipBackground,
      borderColor: CHART_COLORS.tooltipBorder,
      borderRadius: 10,
      textStyle: { color: CHART_COLORS.tooltipText, fontSize: 12.5 },
      axisPointer: { type: 'line', lineStyle: { color: CHART_COLORS.pointer, type: 'dashed' } },
      formatter: (params: { dataIndex: number }[]) => {
        const i = params[0]?.dataIndex ?? 0
        const hour = hours[i]
        if (!hour) {
          return ''
        }
        const day = local.weekday(localClock(hour.timeSec, utcOffsetSec))
        return `${day} ${clock(hour)}<br/>${temps[i] ?? '–'}°<br/>${t('panel.tooltipRain', { value: rain[i] ?? 0 })}`
      },
    },
    xAxis: {
      type: 'category',
      data: labels,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { ...axisLabel, interval: 2 },
    },
    yAxis: [
      {
        type: 'value',
        axisLabel: { ...axisLabel, formatter: '{value}°' },
        splitLine: { lineStyle: { color: CHART_COLORS.gridLine } },
      },
      {
        type: 'value',
        min: 0,
        max: PROB_MAX,
        axisLabel: { ...axisLabel, formatter: '{value}%', color: CHART_COLORS.rainAxis },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        type: 'bar',
        yAxisIndex: 1,
        data: rain,
        barWidth: 8,
        itemStyle: { color: CHART_COLORS.rain, borderRadius: [2, 2, 0, 0] },
        emphasis: { itemStyle: { color: CHART_COLORS.rainEmphasis } },
        markArea: {
          silent: true,
          itemStyle: { color: CHART_COLORS.night },
          data: nightSpans(hours).map(([start, end]) => [{ xAxis: start }, { xAxis: end }]),
        },
      },
      {
        type: 'line',
        data: temps,
        symbol: 'none',
        smooth: false,
        lineStyle: { color: CHART_COLORS.temp, width: 2.5 },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: CHART_COLORS.midnight, type: 'dashed' },
          label: { color: CHART_COLORS.axisLabel, fontSize: 10.5, formatter: (p: { name?: string }) => p.name ?? '' },
          data: midnightIndices(hours).map((i) => {
            const hour = hours[i]
            return { xAxis: i, name: hour ? local.weekdayDay(localClock(hour.timeSec, utcOffsetSec)) : '' }
          }),
        },
      },
    ],
  }
})
</script>
