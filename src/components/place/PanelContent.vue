<template>
  <PanelSkeleton
    v-if="state.status === 'loading' || state.status === 'idle'"
    :compact="compact"
  />
  <PanelError
    v-else-if="state.status === 'error'"
    @retry="emit('retry')"
  />
  <template v-else>
    <NowCard
      :forecast="state.data.data"
      :compact="compact"
    />
    <template v-if="!compact">
      <HourlyChart
        v-if="hours.length > 0"
        :hours="hours"
        :utc-offset-sec="state.data.data.utcOffsetSec"
      />
      <DailyList
        :rows="rows"
        :utc-offset-sec="state.data.data.utcOffsetSec"
      />
    </template>
  </template>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Cached } from '@/api/weatherService'
import DailyList from '@/components/place/DailyList.vue'
import HourlyChart from '@/components/place/HourlyChart.vue'
import NowCard from '@/components/place/NowCard.vue'
import PanelError from '@/components/place/PanelError.vue'
import PanelSkeleton from '@/components/place/PanelSkeleton.vue'
import { useClock } from '@/composables/useClock'
import { nextHours, weeklyRows } from '@/domain/forecastView'
import type { AsyncState, Forecast } from '@/domain/types'

const { state, compact } = defineProps<{
  state: AsyncState<Cached<Forecast>>
  compact: boolean
}>()
const emit = defineEmits<{ retry: [] }>()

const CHART_HOURS = 24
const nowMs = useClock()

const hours = computed(() => (state.status === 'success' ? nextHours(state.data.data, nowMs.value, CHART_HOURS) : []))
const rows = computed(() => (state.status === 'success'
  ? weeklyRows(state.data.data.daily, state.data.data.current.tempC)
  : []))
</script>
