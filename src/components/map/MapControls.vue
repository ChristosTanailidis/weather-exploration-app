<template>
  <div
    class="pointer-events-none absolute inset-0 flex flex-col justify-between gap-2 p-2 sm:p-4"
    role="group"
    :aria-label="t('map.controls')"
  >
    <div class="flex items-start justify-between gap-2">
      <div class="pointer-events-auto">
        <slot name="top-left" />
      </div>
      <div class="pointer-events-auto">
        <slot name="top-right" />
      </div>
    </div>
    <div class="flex flex-col gap-2 sm:mr-12">
      <div class="pointer-events-auto self-start">
        <slot name="bottom-left" />
      </div>
      <div class="pointer-events-auto">
        <slot name="bottom" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>
