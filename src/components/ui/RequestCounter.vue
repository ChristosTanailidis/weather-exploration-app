<template>
  <p
    v-if="visible"
    class="glass rounded-sm px-2 py-1 font-mono text-micro text-text-secondary"
    role="status"
  >
    {{ t('debug.requests', { requests: stats.requests, locations: stats.locations }) }}
  </p>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useRequestStats } from '@/composables/useRequestStats'

const { t } = useI18n()
const route = useRoute()
const stats = useRequestStats()

/** Always in development; in production only with `?debug=1`. */
const visible = computed(() => import.meta.env.DEV || route.query.debug === '1')
</script>
