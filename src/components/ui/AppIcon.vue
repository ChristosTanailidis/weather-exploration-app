<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    :fill="filled ? 'currentColor' : 'none'"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    class="shrink-0"
  >
    <path
      v-for="d in ICON_PATHS[name]"
      :key="d"
      :d="d"
    />
  </svg>
</template>

<script setup lang="ts">
import { ICON_PATHS } from '@/components/ui/iconPaths'
import type { IconName } from '@/components/ui/iconPaths'

const { size = 20, filled = false } = defineProps<{
  name: IconName
  size?: number
  filled?: boolean
}>()
</script>
