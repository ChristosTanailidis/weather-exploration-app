<template>
  <aside
    v-if="places.listOpen"
    class="fixed inset-x-0 top-12 bottom-0 z-(--z-overlay) flex flex-col overflow-hidden rounded-t-[22px] border border-b-0 border-border bg-surface-panel shadow-sheet lg:absolute lg:top-3 lg:right-3 lg:bottom-3 lg:left-auto lg:z-(--z-drawer) lg:w-100 lg:rounded-[20px] lg:border-b lg:shadow-panel"
    :aria-label="t('myPlaces.title')"
    @keydown.esc="close"
  >
    <header class="flex items-center gap-1 pt-4 pr-3 pb-2 pl-5">
      <h2
        ref="heading"
        tabindex="-1"
        class="flex-1 font-display text-title-l tracking-[-0.01em] outline-none"
      >
        {{ t('myPlaces.title') }}
      </h2>
      <button
        type="button"
        class="flex size-11 items-center justify-center rounded-md text-control hover:bg-surface-elevated"
        :aria-label="t('myPlaces.close')"
        @click="close"
      >
        <AppIcon name="close" />
      </button>
    </header>
    <div class="flex items-center gap-2.5 px-5 pb-3">
      <button
        type="button"
        class="inline-flex h-9 items-center gap-2 rounded-[12px] border border-border-strong bg-text-secondary/12 px-3 text-body-s font-semibold disabled:border-transparent disabled:bg-text-secondary/8 disabled:text-text-tertiary"
        :disabled="!canShowMyWorld"
        @click="showMyWorld"
      >
        <AppIcon
          name="globe"
          :size="18"
        />
        {{ t('myPlaces.myWorld') }}
      </button>
      <span class="text-label font-normal text-text-secondary">{{ places.collection.length === 0 ? t('myPlaces.saveForWorld') : t('myPlaces.selectHint') }}</span>
    </div>

    <div class="relative min-h-0 flex-1 overflow-y-auto px-2">
      <ul
        class="flex flex-col gap-0.5"
        :aria-label="t('myPlaces.list')"
      >
        <PlaceRow
          v-for="place in places.listPlaces"
          :key="place.key"
          :place="place"
          :summary="summaries.get(place.key) ?? null"
          :movable="place.kind !== 'location'"
          :comparing="places.compareKeys.includes(place.key)"
          :can-select="places.compareKeys.length < config.compareMax"
          :compare-color="compareColor(place.key)"
          :is-first="places.collection[0]?.key === place.key"
          :is-last="places.collection[places.collection.length - 1]?.key === place.key"
          :dragging="dragKey === place.key"
          @open="open(place)"
          @move="delta => move(place, delta)"
          @remove="remove(place)"
          @toggle-compare="places.toggleCompare(place.key)"
          @drag-start="dragKey = place.key"
          @drag-end="dragKey = null"
          @drop-on="dropOn(place)"
        />
      </ul>
      <div
        v-if="places.collection.length === 0"
        class="mx-3 mt-4 flex flex-col items-center gap-2.5 rounded-[16px] border-[1.5px] border-dashed border-border-strong px-5.5 py-7 text-center"
      >
        <span class="flex size-13 items-center justify-center rounded-full bg-accent-soft text-accent">
          <AppIcon
            name="star"
            :size="26"
            filled
          />
        </span>
        <h3 class="mt-1.5 text-[17px] font-semibold">
          {{ t('myPlaces.emptyTitle') }}
        </h3>
        <I18nT
          keypath="myPlaces.emptyBody"
          tag="p"
          scope="global"
          class="max-w-75 text-body-s leading-[1.55] font-normal text-text-secondary"
        >
          <template #star>
            <strong class="font-semibold text-text-primary">{{ t('myPlaces.star') }}</strong>
          </template>
        </I18nT>
      </div>
      <p
        class="sr-only"
        aria-live="polite"
      >
        {{ announcement }}
      </p>
    </div>

    <footer class="flex items-center gap-3 border-t border-border px-5 pt-4 pb-5">
      <span
        v-if="places.compareKeys.length > 0"
        class="flex"
        aria-hidden="true"
      >
        <span
          v-for="(key, i) in places.compareKeys"
          :key="key"
          class="size-3 rounded-full ring-2 ring-surface-panel-solid"
          :class="i > 0 && '-ml-0.75'"
          :style="{ background: compareColor(key) }"
        />
      </span>
      <span
        class="flex-1 text-label font-normal text-text-secondary"
        aria-live="polite"
      >{{ compareHint }}</span>
      <button
        type="button"
        class="inline-flex h-11 items-center gap-2 rounded-[12px] bg-accent px-4 text-[15px] font-semibold text-text-on-accent hover:bg-accent-hover disabled:bg-text-secondary/8 disabled:text-text-tertiary"
        :disabled="!places.canCompare"
        @click="places.setCompareOpen(true)"
      >
        <AppIcon
          name="compare"
          :size="18"
        />
        {{ t('compare.button') }}
      </button>
    </footer>
  </aside>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { I18nT, useI18n } from 'vue-i18n'
import PlaceRow from '@/components/places/PlaceRow.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useForecastTime } from '@/composables/useForecastTime'
import { useFormat } from '@/composables/useFormat'
import { useMyWorld } from '@/composables/useMyWorld'
import { config } from '@/config'
import { CHART_COLORS } from '@/domain/colorRamps'
import { summarize } from '@/domain/collection'
import type { PlaceSummary } from '@/domain/collection'
import type { Place } from '@/domain/types'
import { useMapStore } from '@/stores/mapStore'
import { usePlacesStore } from '@/stores/placesStore'

const { t } = useI18n()
const places = usePlacesStore()
const map = useMapStore()
const { placeTitle } = useFormat()
const { nowHourSec } = useForecastTime()
const { canShowMyWorld, showMyWorld } = useMyWorld()
const heading = useTemplateRef<HTMLHeadingElement>('heading')
const dragKey = ref<string | null>(null)
const announcement = ref('')

const summaries = computed(() => {
  const result = new Map<string, PlaceSummary>()
  for (const place of places.listPlaces) {
    const series = places.collectionWeather.get(place.key)?.data
    const summary = series ? summarize(series, nowHourSec.value, config.summaryHours) : null
    if (summary) {
      result.set(place.key, summary)
    }
  }
  return result
})

const compareHint = computed(() => {
  const n = places.compareKeys.length
  if (places.listPlaces.length < config.compareMin) {
    return t('compare.saveMore')
  }
  if (n === 1) {
    return t('compare.tooFew')
  }
  return n === 0 ? t('myPlaces.selectHint') : t('compare.selectedCount', { n, max: config.compareMax })
})

/** Each compared place keeps its colour everywhere (list, cards, chart). */
const compareColor = (key: string): string | undefined => {
  const index = places.compareKeys.indexOf(key)
  return index >= 0 ? CHART_COLORS.places[index] : undefined
}

let opener: HTMLElement | null = null
watch(() => places.listOpen, async (open) => {
  if (open) {
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    await nextTick()
    heading.value?.focus()
  }
})

function close(): void {
  places.setListOpen(false)
  const target = opener
  opener = null
  void nextTick(() => target?.focus())
}

function open(place: Place): void {
  places.select(place)
  map.flyTo(place, config.placeZoom)
}

function move(place: Place, delta: number): void {
  places.moveBy(place.key, delta)
  const position = places.collection.findIndex(p => p.key === place.key) + 1
  announcement.value = t('myPlaces.moved', { name: placeTitle(place), position })
}

function remove(place: Place): void {
  places.remove(place.key)
  announcement.value = t('myPlaces.removed', { name: placeTitle(place) })
}

function dropOn(target: Place): void {
  const key = dragKey.value
  dragKey.value = null
  const to = places.collection.findIndex(p => p.key === target.key)
  if (key && to >= 0 && key !== target.key) {
    places.move(key, to)
  }
}
</script>
