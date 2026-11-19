<template>
  <button
    type="button"
    class="flex size-11 items-center justify-center rounded-md text-control hover:bg-surface-elevated disabled:text-text-tertiary disabled:hover:bg-transparent"
    :aria-label="label"
    :title="label"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
const { label } = defineProps<{ label: string }>()
</script>
