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
      <SelectionLayer />
      <LocationMarker />
      <nav
        class="absolute top-[286px] right-3 z-(--z-controls) flex flex-col gap-3 lg:top-22 lg:right-auto lg:left-6"
        :aria-label="t('map.buttons')"
      >
        <div class="glass flex flex-col gap-0.5 rounded-lg p-1">
          <MapButton
            :label="t('location.button')"
            :aria-busy="location.status.value === 'locating'"
            @click="location.locate()"
          >
            <AppIcon
              name="location"
              :class="location.status.value === 'locating' && 'animate-pulse'"
            />
          </MapButton>
          <MapButton
            v-if="isDesktop"
            :label="t('myPlaces.button')"
            :aria-pressed="places.listOpen"
            @click="places.setListOpen(!places.listOpen)"
          >
            <AppIcon
              name="star"
              :filled="places.listOpen"
            />
          </MapButton>
          <MapButton
            :label="t('myPlaces.myWorldLabel')"
            :disabled="!canShowMyWorld"
            @click="showMyWorld"
          >
            <AppIcon name="globe" />
          </MapButton>
        </div>
        <MapZoomButtons v-if="isDesktop" />
      </nav>
    </MapView>
    <PlacePanel />
    <MyPlacesPanel />
    <CompareView />
    <StatusSlot class="absolute inset-x-3 top-[118px] z-(--z-toast) lg:top-22 lg:right-auto lg:left-102 lg:max-w-146" />
    <div class="absolute top-3 right-18 left-3 z-(--z-popover) lg:top-6 lg:right-auto lg:left-6 lg:w-90">
      <SearchBox @select="openSearchResult" />
    </div>
    <button
      v-if="!isDesktop"
      type="button"
      class="glass absolute top-3 right-3 z-(--z-controls) flex size-12 items-center justify-center rounded-lg text-control"
      :aria-label="t('myPlaces.button')"
      :aria-pressed="places.listOpen"
      @click="places.setListOpen(!places.listOpen)"
    >
      <AppIcon
        name="star"
        :filled="places.listOpen"
      />
    </button>
    <LayerSwitcher class="absolute top-[70px] left-3 z-(--z-controls) lg:top-6 lg:left-102" />
    <WeatherLegend class="absolute inset-x-3 bottom-34 z-(--z-controls) lg:right-auto lg:left-6 lg:w-80" />
    <TimeSlider class="absolute inset-x-3 bottom-6 z-(--z-controls) lg:right-(--drawer-zone) lg:left-6" />
    <RequestCounter class="absolute top-[78px] right-3 z-(--z-toast) lg:top-auto lg:right-(--drawer-zone) lg:bottom-34" />
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import CityLayer from '@/components/map/CityLayer.vue'
import GridLayer from '@/components/map/GridLayer.vue'
import LayerSwitcher from '@/components/map/LayerSwitcher.vue'
import MapView from '@/components/map/MapView.vue'
import LocationMarker from '@/components/map/LocationMarker.vue'
import MapButton from '@/components/map/MapButton.vue'
import MapZoomButtons from '@/components/map/MapZoomButtons.vue'
import SelectionLayer from '@/components/map/SelectionLayer.vue'
import TimeSlider from '@/components/map/TimeSlider.vue'
import WeatherLegend from '@/components/map/WeatherLegend.vue'
import PlacePanel from '@/components/place/PlacePanel.vue'
import CompareView from '@/components/places/CompareView.vue'
import MyPlacesPanel from '@/components/places/MyPlacesPanel.vue'
import MissingTokenScreen from '@/components/ui/MissingTokenScreen.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import RequestCounter from '@/components/ui/RequestCounter.vue'
import SearchBox from '@/components/ui/SearchBox.vue'
import StatusSlot from '@/components/ui/StatusSlot.vue'
import { useCities } from '@/composables/useCities'
import { useCollectionWeather } from '@/composables/useCollectionWeather'
import { useCurrentLocation } from '@/composables/useCurrentLocation'
import { useFeedStatus } from '@/composables/useFeedStatus'
import { useIsDesktop } from '@/composables/useLayout'
import { useMyWorld } from '@/composables/useMyWorld'
import { useUrlState } from '@/composables/useUrlState'
import { config, env } from '@/config'
import { placeFromKey } from '@/domain/places'
import { placeFromSearchResult } from '@/domain/search'
import type { SearchResult } from '@/domain/types'
import { useMapStore } from '@/stores/mapStore'
import { usePlacesStore } from '@/stores/placesStore'

const { t } = useI18n()
const isDesktop = useIsDesktop()
const map = useMapStore()
const places = usePlacesStore()
const { cities, ready } = useCities()
const cityIds = computed(() => new Set(cities.value.map(city => city.id)))

useUrlState({
  resolvePlace: async key => placeFromKey(key, await ready(), {
    precision: config.coordPrecision,
    maxKm: config.nearestCityMaxKm,
  }),
})

const { canShowMyWorld, showMyWorld } = useMyWorld()
useCollectionWeather()
useFeedStatus()

const location = useCurrentLocation()
onMounted(() => {
  if (env.mapboxToken) {
    void location.autoLocate()
  }
})

/** Opens a search result: select it (details panel) and fly there. */
function openSearchResult(result: SearchResult): void {
  const place = placeFromSearchResult(result, id => cityIds.value.has(id), config.coordPrecision)
  places.select(place)
  map.flyTo(place, config.placeZoom)
}
</script>
