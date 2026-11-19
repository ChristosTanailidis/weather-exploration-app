<template>
  <MissingTokenScreen v-if="!env.mapboxToken" />
  <main
    v-else
    class="relative h-full overflow-hidden"
  >
    <h1 class="sr-only">
      {{ t('app.title') }}
    </h1>
    <MapView />
    <MapControls />
  </main>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import MapControls from '@/components/map/MapControls.vue'
import MapView from '@/components/map/MapView.vue'
import MissingTokenScreen from '@/components/ui/MissingTokenScreen.vue'
import { useUrlState } from '@/composables/useUrlState'
import { env } from '@/config'

const { t } = useI18n()

useUrlState()
</script>
