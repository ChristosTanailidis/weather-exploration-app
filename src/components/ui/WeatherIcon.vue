<template>
  <img
    :src="src"
    :alt="alt"
    :width="size"
    :height="size"
    class="block flex-none"
  >
</template>

<script setup lang="ts">
import { usePreferredReducedMotion } from '@vueuse/core'
import { computed } from 'vue'
import type { WeatherIcon } from '@/domain/wmo'

const { icon, size = 30, alt = '', animated = true } = defineProps<{
  icon: WeatherIcon
  size?: number
  alt?: string
  /** Animated Meteocons in panels; static ones with reduced motion. */
  animated?: boolean
}>()

const ANIMATED = import.meta.glob<string>('@/assets/weather-icons/animated/*.svg', { eager: true, query: '?url', import: 'default' })
const STATIC = import.meta.glob<string>('@/assets/weather-icons/static/*.svg', { eager: true, query: '?url', import: 'default' })

const motion = usePreferredReducedMotion()
const byName = (set: Record<string, string>, name: string): string | undefined =>
  Object.entries(set).find(([path]) => path.endsWith(`/${name}.svg`))?.[1]

const src = computed(() => {
  const set = animated && motion.value !== 'reduce' ? ANIMATED : STATIC
  return byName(set, icon) ?? byName(STATIC, 'not-available')
})
</script>
