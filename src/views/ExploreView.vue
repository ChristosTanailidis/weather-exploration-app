<template>
  <MissingTokenScreen v-if="!env.mapboxToken" />
  <main
    v-else
    class="flex h-full items-center justify-center p-4"
  >
    <h1 class="text-2xl font-semibold text-ink">
      {{ t('app.title') }}
    </h1>
  </main>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import MissingTokenScreen from '@/components/ui/MissingTokenScreen.vue'
import { env } from '@/config'

const { t } = useI18n()
</script>
