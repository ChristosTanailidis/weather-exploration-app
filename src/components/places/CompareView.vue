<template>
  <div
    v-if="places.compareOpen"
    class="fixed inset-0 z-(--z-overlay) lg:bg-black/60 lg:p-3"
  >
    <section
      class="flex h-full flex-col overflow-y-auto overscroll-contain bg-surface-panel-solid lg:rounded-[20px] lg:border lg:border-border lg:shadow-panel"
      :aria-label="t('compare.title')"
    >
      <header class="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 pt-3 pb-3 lg:px-6 lg:pt-5 lg:pb-4">
        <button
          type="button"
          class="inline-flex h-11 items-center gap-2 rounded-md px-3 text-body-s font-semibold text-control hover:bg-surface-elevated"
          @click="close"
        >
          <AppIcon name="back" />
          <span :class="!isDesktop && 'sr-only'">{{ t('compare.back') }}</span>
        </button>
        <span
          class="hidden h-7 w-px bg-border lg:block"
          aria-hidden="true"
        />
        <h2
          ref="heading"
          tabindex="-1"
          class="font-display text-title-l outline-none"
        >
          {{ t('compare.title') }}
        </h2>
        <span class="text-body-s font-normal text-text-secondary">{{ t('compare.subtitle', { n: lines.length }) }}</span>
        <button
          type="button"
          class="ml-auto inline-flex h-11 items-center gap-2 rounded-[12px] border border-border-strong bg-text-secondary/8 px-4 text-[15px] font-semibold"
          @click="edit"
        >
          <AppIcon
            name="star"
            :size="18"
          />
          {{ t('compare.edit') }}
        </button>
      </header>

      <div class="flex flex-col gap-4 px-3 pb-4 lg:grid lg:flex-1 lg:grid-rows-[auto_minmax(var(--compare-chart-min),1fr)] lg:px-6 lg:pb-6">
        <ul class="grid grid-cols-1 gap-3 lg:grid-cols-[repeat(auto-fit,minmax(0,1fr))]">
          <li
            v-for="(card, i) in cards"
            :key="card.place.key"
            class="relative rounded-[16px] border border-border bg-surface-card p-4"
            :style="{ borderTop: `4px solid ${card.color}` }"
          >
            <button
              type="button"
              class="absolute top-2 right-2 flex size-9 items-center justify-center rounded-md text-control hover:bg-surface-elevated"
              :aria-label="t('compare.remove', { name: card.title })"
              @click="places.toggleCompare(card.place.key)"
            >
              <AppIcon
                name="close"
                :size="18"
              />
            </button>
            <span
              v-if="card.place.kind === 'location'"
              class="text-micro font-semibold tracking-[0.06em] text-location uppercase"
            >{{ t('myPlaces.youAreHere') }}</span>
            <h3 class="flex items-center gap-2 pr-9 text-body-l">
              <span
                class="size-2.5 flex-none rounded-full"
                :style="{ background: card.color }"
                aria-hidden="true"
              />
              <span class="truncate">{{ card.title }}</span>
            </h3>
            <p class="mt-1 flex items-center gap-1.5 text-label font-normal text-text-secondary">
              <FlagIcon
                v-if="card.place.countryCode"
                :country-code="card.place.countryCode"
                :country="card.place.country"
                :width="16"
              />
              {{ card.region }}
            </p>
            <div class="mt-3 flex items-center gap-3">
              <WeatherIcon
                v-if="card.summary"
                :icon="card.summary.icon"
                :size="56"
              />
              <span class="font-display text-[44px] leading-none font-medium tracking-[-0.03em]">{{ temp(card.summary?.tempC, true) }}</span>
              <span
                v-if="card.summary"
                class="text-body-s font-normal text-text-secondary"
              >{{ t(card.summary.labelKey) }}</span>
            </div>
            <div
              class="mt-3 grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-2 text-label font-normal text-text-secondary tabular-nums"
              :aria-label="t('compare.rangeLabel', { min: temp(card.summary?.minC, true), max: temp(card.summary?.maxC, true) })"
            >
              <span class="text-caption text-text-tertiary">{{ t('compare.range') }}</span>
              <span>{{ temp(card.summary?.minC, true) }}</span>
              <span class="relative h-1.5 rounded-[3px] bg-text-secondary/12">
                <span
                  class="absolute inset-y-0 rounded-[3px]"
                  :style="{ left: `${bars[i]?.leftPct ?? 0}%`, width: `${bars[i]?.widthPct ?? 0}%`, background: card.gradient }"
                >
                  <span
                    v-if="bars[i]?.nowPct != null"
                    class="absolute top-1/2 size-2 -translate-1/2 rounded-full bg-text-primary ring-2 ring-surface-card"
                    :style="{ left: `${bars[i]?.nowPct}%` }"
                  />
                </span>
              </span>
              <span class="font-semibold text-text-primary">{{ temp(card.summary?.maxC, true) }}</span>
            </div>
          </li>
        </ul>
        <CompareChart :lines="lines" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { computed, defineAsyncComponent, nextTick, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CompareLine } from '@/components/places/CompareChart.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import FlagIcon from '@/components/ui/FlagIcon.vue'
import WeatherIcon from '@/components/ui/WeatherIcon.vue'
import { useClock } from '@/composables/useClock'
import { useForecastTime } from '@/composables/useForecastTime'
import { useFormat } from '@/composables/useFormat'
import { useIsDesktop } from '@/composables/useLayout'
import { config } from '@/config'
import { alignSeries, sharedRangeBars, summarize } from '@/domain/collection'
import { CHART_COLORS, COLOR_RAMPS, colorAt } from '@/domain/colorRamps'
import { localClock } from '@/domain/forecastView'
import { displayTemp } from '@/domain/units'
import { usePlacesStore } from '@/stores/placesStore'
import { useSettingsStore } from '@/stores/settingsStore'

const MS_PER_SEC = 1000

/** ECharts loads only when Compare first opens. */
const CompareChart = defineAsyncComponent(() => import('@/components/places/CompareChart.vue'))

const { t } = useI18n()
const places = usePlacesStore()
const settings = useSettingsStore()
const isDesktop = useIsDesktop()
const { nowHourSec } = useForecastTime()
const nowMs = useClock()
const { temp, placeTitle, countryName, local } = useFormat()
const heading = useTemplateRef<HTMLHeadingElement>('heading')

/** Built only from the collection's overview data: no request when it is cached. */
const cards = computed(() => places.comparePlaces.map((place, i) => {
  const series = places.collectionWeather.get(place.key)?.data
  const summary = series ? summarize(series, nowHourSec.value, config.summaryHours) : null
  const time = series ? local.clock(localClock(Math.floor(nowMs.value / MS_PER_SEC), series.utcOffsetSec)) : ''
  const country = place.country || countryName(place.countryCode)
  return {
    place,
    series,
    summary,
    title: placeTitle(place),
    color: CHART_COLORS.places[i] ?? CHART_COLORS.places[0],
    region: country ? t('compare.cardRegion', { country, time }) : time,
    gradient: summary?.minC != null && summary.maxC != null
      ? `linear-gradient(90deg, ${colorAt(COLOR_RAMPS.temperature, summary.minC)}, ${colorAt(COLOR_RAMPS.temperature, summary.maxC)})`
      : 'transparent',
  }
}))

const bars = computed(() => sharedRangeBars(cards.value.map(card => ({
  min: card.summary?.minC ?? null,
  max: card.summary?.maxC ?? null,
  now: card.summary?.tempC ?? null,
}))))

const lines = computed<CompareLine[]>(() => cards.value.map(card => ({
  place: card.place,
  title: card.title,
  color: card.color,
  values: alignSeries(card.series, nowHourSec.value, config.forecastHours, (s, i) => displayTemp(s.tempC[i], settings.units)),
})))

let opener: HTMLElement | null = null
watch(() => places.compareOpen, async (open) => {
  if (open) {
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    await nextTick()
    heading.value?.focus()
  }
})

/** Fewer than two places left: back to the list. */
watch(() => places.comparePlaces.length, (n) => {
  if (places.compareOpen && n < config.compareMin) {
    edit()
  }
})

/** Esc closes, even when focus was on a card that has just been removed. */
useEventListener(window, 'keydown', (event: KeyboardEvent) => {
  if (event.key === 'Escape' && places.compareOpen) {
    close()
  }
})

function close(): void {
  places.setCompareOpen(false)
  const target = opener
  opener = null
  void nextTick(() => target?.focus())
}

function edit(): void {
  places.setCompareOpen(false)
  places.setListOpen(true)
}
</script>
