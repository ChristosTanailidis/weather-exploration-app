<template>
  <RouterView />
</template>

<script setup lang="ts">
import { useTitle } from '@vueuse/core'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

useTitle(() => t('app.title'))
</script>
