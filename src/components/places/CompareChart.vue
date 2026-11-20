<template>
  <section class="rounded-[16px] border border-border bg-surface-card/60 p-4 lg:p-5">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <h3 class="text-body-s font-semibold">
        {{ t('compare.chartTitle', { unit: t(`legend.unit.${settings.units === 'metric' ? 'celsius' : 'fahrenheit'}`) }) }}
      </h3>
      <ul
        class="flex flex-wrap gap-x-4 gap-y-1 text-label font-normal text-text-secondary"
        aria-hidden="true"
      >
        <li
          v-for="(line, i) in lines"
          :key="line.place.key"
          class="flex items-center gap-2"
        >
          <svg
            width="24"
            height="4"
            class="flex-none"
          ><line
            x1="0"
            y1="2"
            x2="24"
            y2="2"
            :stroke="line.color"
            stroke-width="2.5"
            :stroke-dasharray="DASH_CSS[i]"
          /></svg>
          {{ line.title }}
        </li>
      </ul>
    </div>
    <div
      :class="isDesktop ? 'h-110' : 'h-75'"
      role="img"
      :aria-label="t('compare.chartLabel', { names: lines.map(l => l.title).join(', ') })"
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
import { useForecastTime } from '@/composables/useForecastTime'
import { useIsDesktop } from '@/composables/useLayout'
import { config } from '@/config'
import { CHART_COLORS } from '@/domain/colorRamps'
import { HOUR_SEC } from '@/domain/mapFeatures'
import { nightRanges } from '@/domain/sun'
import { dayStartIndices } from '@/domain/time'
import type { Place } from '@/domain/types'
import { useSettingsStore } from '@/stores/settingsStore'

export interface CompareLine {
  place: Place
  title: string
  color: string
  /** Display values (already converted to the selected units) per hour. */
  values: (number | null)[]
}

const { lines } = defineProps<{ lines: readonly CompareLine[] }>()

/** Dash per place, so lines differ by more than colour. */
const DASHES: readonly (string | number[])[] = ['solid', [6, 4], [2, 3], [8, 3, 2, 3]]
const DASH_CSS: readonly string[] = ['', '6 4', '2 3', '8 3 2 3']
const MS_PER_SEC = 1000
const LABEL_EVERY = { desktop: 5, mobile: 11 }

const { t, d } = useI18n()
const isDesktop = useIsDesktop()
const motion = usePreferredReducedMotion()
const { nowHourSec } = useForecastTime()
const settings = useSettingsStore()

const option = computed(() => {
  const start = nowHourSec.value
  const hours = config.forecastHours
  const instants = Array.from({ length: hours }, (_, i) => new Date((start + i * HOUR_SEC) * MS_PER_SEC))
  const labels = instants.map(date => d(date, 'hourMinute'))
  const axisLabel = { color: CHART_COLORS.axisLabel, fontFamily: 'Inter Variable, Inter, sans-serif', fontSize: 11 }
  const midnights = dayStartIndices(start, hours, sec => new Date(sec * MS_PER_SEC).getDate())
  const first = lines[0]?.place
  const nights = first ? nightRanges(first, start, hours) : []
  return {
    animation: motion.value !== 'reduce',
    grid: isDesktop.value ? { left: 36, right: 12, top: 24, bottom: 44 } : { left: 32, right: 8, top: 20, bottom: 36 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: CHART_COLORS.tooltipBackground,
      borderColor: CHART_COLORS.tooltipBorder,
      borderRadius: 10,
      textStyle: { color: CHART_COLORS.tooltipText, fontSize: 12.5 },
      axisPointer: { type: 'line', lineStyle: { color: CHART_COLORS.pointer, type: 'dashed' } },
      formatter: (params: { dataIndex: number }[]) => {
        const i = params[0]?.dataIndex ?? 0
        const date = instants[i]
        const rows = lines.map(line => `<span style="color:${line.color}">●</span> ${line.title}&nbsp;&nbsp;<b>${line.values[i] ?? '–'}°</b>`)
        return [date ? d(date, 'weekdayHourMinute') : '', ...rows].join('<br/>')
      },
    },
    xAxis: {
      type: 'category',
      data: labels,
      boundaryGap: false,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { ...axisLabel, interval: isDesktop.value ? LABEL_EVERY.desktop : LABEL_EVERY.mobile },
    },
    yAxis: {
      type: 'value',
      axisLabel: { ...axisLabel, formatter: '{value}°' },
      splitLine: { lineStyle: { color: CHART_COLORS.gridLine } },
    },
    series: lines.map((line, i) => ({
      type: 'line',
      name: line.title,
      data: line.values,
      symbol: 'none',
      lineStyle: { color: line.color, width: 2.5, type: DASHES[i] ?? 'solid' },
      itemStyle: { color: line.color },
      ...(i === 0
        ? {
            markLine: {
              silent: true,
              symbol: 'none',
              data: [
                { xAxis: 0, lineStyle: { color: CHART_COLORS.now, width: 2, type: 'solid' }, label: { formatter: t('compare.now'), color: CHART_COLORS.now, position: 'end' } },
                ...midnights.map(index => ({
                  xAxis: index,
                  lineStyle: { color: CHART_COLORS.midnight, type: 'dashed' },
                  label: { formatter: instants[index] ? d(instants[index], 'weekdayDay') : '', color: CHART_COLORS.axisLabel, position: 'end' },
                })),
                ...(settings.units === 'metric' ? [{ yAxis: 0, lineStyle: { color: CHART_COLORS.zeroLine, type: 'solid' }, label: { show: false } }] : []),
              ],
            },
            markArea: {
              silent: true,
              itemStyle: { color: CHART_COLORS.night },
              data: nights.map(range => [{ xAxis: range.start }, { xAxis: Math.min(range.end, hours - 1) }]),
            },
          }
        : {}),
    })),
  }
})
</script>
