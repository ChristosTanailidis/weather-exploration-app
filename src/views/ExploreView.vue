<template>
  <MissingTokenScreen v-if="!env.mapboxToken" />
  <main
    v-else
    class="relative h-full overflow-hidden bg-surface-space"
  >
    <h1 class="sr-only">
      {{ t('app.title') }}
    </h1>
    <MapView>
      <GridLayer v-if="config.enableGridLayer" />
      <CityLayer />
      <nav
        v-if="isDesktop"
        class="absolute top-22 left-6 z-(--z-controls) flex flex-col gap-3"
        :aria-label="t('map.buttons')"
      >
        <MapZoomButtons />
      </nav>
    </MapView>
    <LayerSwitcher class="absolute inset-x-3 top-[114px] z-(--z-controls) lg:top-6 lg:right-auto lg:left-102" />
    <WeatherLegend class="absolute inset-x-3 bottom-34 z-(--z-controls) lg:right-auto lg:left-6 lg:w-80" />
    <TimeSlider class="absolute inset-x-3 bottom-6 z-(--z-controls) lg:right-(--drawer-zone) lg:left-6" />
    <RequestCounter class="absolute top-1.5 right-3 z-(--z-toast) lg:top-6 lg:right-(--drawer-zone)" />
  </main>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import CityLayer from '@/components/map/CityLayer.vue'
import GridLayer from '@/components/map/GridLayer.vue'
import LayerSwitcher from '@/components/map/LayerSwitcher.vue'
import MapView from '@/components/map/MapView.vue'
import MapZoomButtons from '@/components/map/MapZoomButtons.vue'
import TimeSlider from '@/components/map/TimeSlider.vue'
import WeatherLegend from '@/components/map/WeatherLegend.vue'
import MissingTokenScreen from '@/components/ui/MissingTokenScreen.vue'
import RequestCounter from '@/components/ui/RequestCounter.vue'
import { useIsDesktop } from '@/composables/useLayout'
import { useUrlState } from '@/composables/useUrlState'
import { config, env } from '@/config'

const { t } = useI18n()
const isDesktop = useIsDesktop()

useUrlState()
</script>
