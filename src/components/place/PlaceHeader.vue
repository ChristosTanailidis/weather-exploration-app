<template>
  <header class="flex items-start gap-1 pt-4 pr-3 pb-4 pl-5">
    <div class="flex min-w-0 flex-1 flex-col gap-1.5 pt-1.5">
      <h2
        ref="heading"
        tabindex="-1"
        class="font-display text-title-l tracking-[-0.01em] outline-none"
      >
        {{ title }}
      </h2>
      <div
        v-if="regionText"
        class="flex h-5 items-center gap-2 text-body-s font-normal text-text-secondary"
      >
        <FlagIcon
          v-if="place.countryCode"
          :country-code="place.countryCode"
          :country="place.country"
          :width="20"
        />
        <span class="truncate">{{ regionText }}</span>
      </div>
      <div class="flex h-4.5 items-center gap-1.5 text-label font-normal text-text-tertiary">
        <AppIcon
          name="clock"
          :size="14"
        />
        <span v-if="localTime">{{ localTime }}</span>
        <span
          v-else
          class="skeleton block h-3 w-42.5 rounded-[6px]"
          aria-hidden="true"
        />
      </div>
      <span
        v-if="staleText"
        class="text-caption text-warning"
      >{{ staleText }}</span>
    </div>
    <button
      type="button"
      class="header-button"
      :class="saved && 'text-accent'"
      :aria-label="saved ? t('panel.unsave', { name: title }) : t('panel.save', { name: title })"
      :aria-pressed="saved"
      @click="places.toggleSaved(place)"
    >
      <AppIcon
        name="star"
        :size="22"
        :filled="saved"
      />
    </button>
    <button
      type="button"
      class="header-button"
      :aria-label="t('panel.close')"
      @click="emit('close')"
    >
      <AppIcon name="close" />
    </button>
  </header>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Cached } from '@/api/weatherService'
import AppIcon from '@/components/ui/AppIcon.vue'
import FlagIcon from '@/components/ui/FlagIcon.vue'
import { useClock } from '@/composables/useClock'
import { useFormat } from '@/composables/useFormat'
import { localClock } from '@/domain/forecastView'
import type { Forecast, Place } from '@/domain/types'
import { usePlacesStore } from '@/stores/placesStore'

const { place, forecast } = defineProps<{
  place: Place
  forecast: Cached<Forecast> | null
}>()
const emit = defineEmits<{ close: [] }>()

const MS_PER_SEC = 1000
const MS_PER_MIN = 60_000

const { t } = useI18n()
const places = usePlacesStore()
const { placeTitle, region, local } = useFormat()
const nowMs = useClock()
const heading = useTemplateRef<HTMLHeadingElement>('heading')

const title = computed(() => placeTitle(place))
const regionText = computed(() => region(place))
const saved = computed(() => places.isSaved(place.key))

const localTime = computed(() => {
  if (!forecast) {
    return ''
  }
  const date = localClock(Math.floor(nowMs.value / MS_PER_SEC), forecast.data.utcOffsetSec)
  return t('panel.localTime', { time: local.clock(date), date: local.day(date) })
})

const staleText = computed(() => (forecast?.stale
  ? t('panel.updated', { minutes: Math.max(1, Math.round((nowMs.value - forecast.fetchedAt) / MS_PER_MIN)) })
  : ''))

defineExpose({ focus: () => heading.value?.focus() })
</script>

<style scoped>
@reference "@/assets/main.css";

.header-button {
  @apply flex size-11 flex-none items-center justify-center rounded-md text-control hover:bg-surface-elevated;
}
</style>
