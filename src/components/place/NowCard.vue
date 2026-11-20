<template>
  <section
    :aria-label="t('panel.now')"
    class="mx-4 rounded-[16px] border border-border/60 bg-surface-card lg:mx-5"
    :class="compact ? 'p-3.5' : 'p-4.5'"
  >
    <div class="flex items-center gap-3">
      <WeatherIcon
        :icon="weather.icon"
        :size="compact ? 64 : 80"
        class="-my-2 -mr-1 -ml-2.5"
      />
      <span
        class="font-display font-medium tracking-[-0.04em]"
        :class="compact ? 'text-display-l' : 'text-display-xl'"
      >{{ temp(current.tempC, true) }}</span>
      <div class="ml-1 flex min-w-0 flex-col gap-1">
        <span class="text-body-l">{{ t(weather.labelKey) }}</span>
        <span class="text-body-s font-normal text-text-secondary">{{ compact ? feelsLikeWind : t('panel.feelsLike', { temp: temp(current.apparentTempC, true) }) }}</span>
      </div>
    </div>

    <template v-if="!compact">
      <div class="mt-4 grid grid-cols-3 gap-3 border-t border-border/75 pt-3.5">
        <div class="stat">
          <span class="stat-label"><AppIcon
            name="humidity"
            :size="14"
          />{{ t('panel.humidity') }}</span>
          <span class="stat-value">{{ percent(current.humidityPct) }}</span>
        </div>
        <div class="stat">
          <span class="stat-label"><AppIcon
            name="wind"
            :size="14"
          />{{ t('panel.wind') }}</span>
          <span class="stat-value">
            {{ speed(current.windKmh) }}
            <template v-if="current.windDirDeg !== null">
              <AppIcon
                name="arrowUp"
                :size="16"
                :style="{ transform: `rotate(${(current.windDirDeg + HALF_TURN) % FULL_TURN}deg)` }"
              />
              <span class="text-label font-medium text-text-secondary">{{ t(`compass.${compassPoint(current.windDirDeg)}`) }}</span>
            </template>
          </span>
        </div>
        <div class="stat">
          <span class="stat-label"><AppIcon
            name="umbrella"
            :size="14"
          />{{ t('panel.precip') }}</span>
          <span class="stat-value">{{ precip(current.precipMm) }}</span>
        </div>
      </div>
      <div
        v-if="sunrise || sunset"
        class="mt-3.5 flex gap-4 text-label font-normal text-text-secondary"
      >
        <span
          v-if="sunrise"
          class="flex items-center gap-1.5"
        ><AppIcon
          name="sunrise"
          :size="16"
        />{{ t('panel.sunrise') }} <strong class="font-semibold text-text-primary">{{ sunrise }}</strong></span>
        <span
          v-if="sunset"
          class="flex items-center gap-1.5"
        ><AppIcon
          name="sunset"
          :size="16"
        />{{ t('panel.sunset') }} <strong class="font-semibold text-text-primary">{{ sunset }}</strong></span>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppIcon from '@/components/ui/AppIcon.vue'
import WeatherIcon from '@/components/ui/WeatherIcon.vue'
import { useFormat } from '@/composables/useFormat'
import { compassPoint, localClock } from '@/domain/forecastView'
import type { Forecast } from '@/domain/types'
import { describeWeather } from '@/domain/wmo'

const { forecast, compact = false } = defineProps<{
  forecast: Forecast
  compact?: boolean
}>()

const HALF_TURN = 180
const FULL_TURN = 360

const { t } = useI18n()
const { temp, speed, precip, percent, local } = useFormat()

const current = computed(() => forecast.current)
const weather = computed(() => describeWeather(current.value.weatherCode, current.value.isDay))

const feelsLikeWind = computed(() => t('panel.feelsLikeWind', {
  temp: temp(current.value.apparentTempC, true),
  wind: speed(current.value.windKmh),
  direction: current.value.windDirDeg === null ? '' : t(`compass.${compassPoint(current.value.windDirDeg)}`),
}))

const atLocal = (sec: number | null | undefined): string =>
  (sec == null ? '' : local.clock(localClock(sec, forecast.utcOffsetSec)))
const sunrise = computed(() => atLocal(forecast.daily.sunriseSec[0]))
const sunset = computed(() => atLocal(forecast.daily.sunsetSec[0]))
</script>

<style scoped>
@reference "@/assets/main.css";

.stat {
  @apply flex flex-col gap-1;
}

.stat-label {
  @apply flex items-center gap-1.25 text-caption font-normal text-text-tertiary;
}

.stat-value {
  @apply flex items-center gap-1.25 text-[15px] font-semibold tabular-nums;
}
</style>
