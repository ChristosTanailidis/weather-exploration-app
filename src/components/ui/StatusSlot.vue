<template>
  <div
    v-if="message"
    :key="message.id"
    :role="message.kind === 'danger' || message.kind === 'warning' ? 'alert' : 'status'"
    class="status flex items-start gap-3 rounded-lg py-3 pr-2 pl-3.5"
    :style="{ '--tint': TINTS[message.kind] }"
  >
    <span
      class="pt-0.5"
      :style="{ color: TINTS[message.kind] }"
    >
      <AppIcon :name="message.icon" />
    </span>
    <div class="flex min-w-0 flex-1 flex-col gap-0.75">
      <span class="text-body-s font-semibold">{{ message.title }}</span>
      <span
        v-if="message.body"
        class="text-label leading-normal font-normal text-text-secondary"
      >{{ message.body }}</span>
      <span
        v-if="message.detail"
        class="text-label leading-normal font-normal text-text-secondary"
        aria-hidden="true"
      >{{ message.detail }}</span>
    </div>
    <button
      v-if="message.action"
      type="button"
      class="inline-flex h-9 flex-none items-center gap-2 rounded-[12px] border border-border-strong bg-text-secondary/12 px-3 text-body-s font-semibold whitespace-nowrap"
      @click="message.action.run"
    >
      <AppIcon
        v-if="message.action.icon"
        :name="message.action.icon"
        :size="18"
      />
      {{ message.action.label }}
    </button>
    <button
      v-if="message.dismissible"
      type="button"
      class="flex size-9 flex-none items-center justify-center rounded-md text-control"
      :aria-label="t('status.dismiss')"
      @click="status.clear(message.id)"
    >
      <AppIcon
        name="close"
        :size="18"
      />
    </button>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import AppIcon from '@/components/ui/AppIcon.vue'
import type { StatusKind } from '@/stores/statusStore'
import { useStatusStore } from '@/stores/statusStore'

const { t } = useI18n()
const status = useStatusStore()
const { message } = storeToRefs(status)

const TINTS: Readonly<Record<StatusKind, string>> = {
  info: 'var(--color-focus)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
}
</script>

<style scoped>
@reference "@/assets/main.css";

/* Borderless toast: a tint of the message colour over the overlay, with blur. */
.status {
  background:
    linear-gradient(color-mix(in srgb, var(--tint) calc(var(--toast-tint) * 100%), transparent), color-mix(in srgb, var(--tint) calc(var(--toast-tint) * 100%), transparent)),
    rgb(11 17 29 / 0.72);
  backdrop-filter: blur(var(--blur-overlay));
  -webkit-backdrop-filter: blur(var(--blur-overlay));
}
</style>
