<template>
  <img
    v-if="src"
    :src="src"
    :alt="t('place.flag', { country: countryName })"
    :width="width"
    :height="Math.round(width * FLAG_RATIO)"
    class="flex-none rounded-[2px] ring-1 ring-white/18"
  >
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { countryCode, country = '', width = 22 } = defineProps<{
  countryCode: string
  country?: string
  width?: number
}>()

const { t, locale } = useI18n()
const FLAG_RATIO = 3 / 4

/** 4:3 flags from flag-icons; each file is only fetched when shown. */
const FLAGS = import.meta.glob<string>('../../../node_modules/flag-icons/flags/4x3/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
})

const src = computed(() => FLAGS[`../../../node_modules/flag-icons/flags/4x3/${countryCode.toLowerCase()}.svg`])

const countryName = computed(() => {
  if (country) {
    return country
  }
  try {
    return new Intl.DisplayNames([locale.value], { type: 'region' }).of(countryCode.toUpperCase()) ?? countryCode
  }
  catch {
    return countryCode
  }
})
</script>
