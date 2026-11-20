<template>
  <div
    aria-busy="true"
    :aria-label="t('panel.loadingNow')"
  >
    <section class="mx-4 rounded-[16px] border border-border/60 bg-surface-card p-4.5 lg:mx-5">
      <div class="flex h-16 items-center gap-3.5">
        <span class="skeleton block size-16 rounded-full" />
        <span class="skeleton block h-14 w-26 rounded-md" />
        <span class="flex flex-col gap-2.5">
          <span class="skeleton block h-3.5 w-27.5 rounded-[6px]" />
          <span class="skeleton block h-3 w-21.5 rounded-[6px]" />
        </span>
      </div>
      <div
        v-if="!compact"
        class="mt-4 grid grid-cols-3 gap-3 border-t border-border/75 pt-3.5"
      >
        <span
          v-for="n in 3"
          :key="n"
          class="flex flex-col gap-2"
        >
          <span class="skeleton block h-2.5 w-16 rounded-[6px]" />
          <span class="skeleton block h-3.5 w-18 rounded-[6px]" />
        </span>
      </div>
    </section>
    <template v-if="!compact">
      <section
        class="mx-4 mt-5 lg:mx-5"
        :aria-label="t('panel.next24Loading')"
      >
        <h3 class="mb-2.5 text-[15px] font-semibold">
          {{ t('panel.next24') }}
        </h3>
        <span class="skeleton mt-9 ml-7 block h-32 w-[calc(100%-58px)] rounded-md opacity-60" />
      </section>
      <section
        class="mx-4 mt-9 lg:mx-5"
        :aria-label="t('panel.sevenDaysLoading')"
      >
        <h3 class="mb-1 text-[15px] font-semibold">
          {{ t('panel.sevenDays') }}
        </h3>
        <div
          v-for="n in 7"
          :key="n"
          class="grid h-11 grid-cols-[56px_30px_48px_30px_minmax(0,1fr)_30px] items-center gap-x-2.5"
        >
          <span class="skeleton block h-3 w-9 rounded-[6px]" />
          <span class="skeleton block size-6.5 rounded-full" />
          <span class="skeleton block h-3 w-8.5 rounded-[6px]" />
          <span class="skeleton block h-3 w-5.5 justify-self-end rounded-[6px]" />
          <span class="skeleton block h-1.5 w-3/5 rounded-[3px]" />
          <span class="skeleton block h-3 w-6 rounded-[6px]" />
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { compact = false } = defineProps<{ compact?: boolean }>()
const { t } = useI18n()
</script>
