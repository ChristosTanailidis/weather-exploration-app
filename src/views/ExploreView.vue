<template>
  <MissingTokenScreen v-if="!env.mapboxToken" />
  <main
    v-else
    class="relative h-full overflow-hidden"
  >
    <h1 class="sr-only">
      {{ t('app.title') }}
    </h1>
    <MapView>
      <CityLayer />
    </MapView>
    <MapControls>
      <template #top-right>
        <LayerSwitcher />
      </template>
      <template #bottom-left>
        <div class="flex flex-col items-start gap-2">
          <RequestCounter />
          <WeatherLegend />
        </div>
      </template>
    </MapControls>
  </main>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import CityLayer from '@/components/map/CityLayer.vue'
import LayerSwitcher from '@/components/map/LayerSwitcher.vue'
import MapControls from '@/components/map/MapControls.vue'
import MapView from '@/components/map/MapView.vue'
import WeatherLegend from '@/components/map/WeatherLegend.vue'
import MissingTokenScreen from '@/components/ui/MissingTokenScreen.vue'
import RequestCounter from '@/components/ui/RequestCounter.vue'
import { useUrlState } from '@/composables/useUrlState'
import { env } from '@/config'

const { t } = useI18n()

useUrlState()
</script>
