<template>
  <div
    role="alert"
    class="mx-4 flex flex-col items-start gap-2.5 rounded-[16px] border border-danger/28 bg-surface-card px-5 py-6 lg:mx-5"
  >
    <span class="flex size-11 items-center justify-center rounded-full bg-danger/14 text-danger">
      <AppIcon name="offline" />
    </span>
    <h3 class="mt-1 text-[17px] font-semibold">
      {{ t('panel.errorTitle') }}
    </h3>
    <p class="text-body-s leading-[1.55] font-normal text-text-secondary">
      {{ t('panel.errorBody') }}
    </p>
    <button
      type="button"
      class="mt-1.5 inline-flex h-11 items-center gap-2 rounded-[12px] bg-accent px-4 text-[15px] font-semibold text-text-on-accent hover:bg-accent-hover"
      @click="emit('retry')"
    >
      <AppIcon
        name="refresh"
        :size="18"
      />
      {{ t('panel.retry') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppIcon from '@/components/ui/AppIcon.vue'

const emit = defineEmits<{ retry: [] }>()
const { t } = useI18n()
</script>
