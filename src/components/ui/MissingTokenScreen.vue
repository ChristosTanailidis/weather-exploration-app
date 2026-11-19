<template>
  <main class="flex min-h-full items-center justify-center p-4">
    <section
      class="w-full max-w-lg space-y-4 rounded-lg border border-line bg-surface p-6"
      aria-labelledby="missing-token-title"
    >
      <h1
        id="missing-token-title"
        class="text-xl font-semibold"
      >
        {{ t('missingToken.title') }}
      </h1>
      <p class="text-ink-muted">
        {{ t('missingToken.intro') }}
      </p>

      <ol
        class="list-decimal space-y-2 pl-5"
        :aria-label="t('missingToken.steps')"
      >
        <I18nT
          keypath="missingToken.stepAccount"
          tag="li"
          scope="global"
        >
          <template #link>
            <a
              class="underline"
              :href="links.mapboxSignup"
              target="_blank"
              rel="noopener noreferrer"
            >{{ t('missingToken.stepAccountLink') }}</a>
          </template>
          <template #prefix>
            <code class="code">{{ t('missingToken.code.prefix') }}</code>
          </template>
        </I18nT>
        <I18nT
          keypath="missingToken.stepEnv"
          tag="li"
          scope="global"
        >
          <template #example>
            <code class="code">{{ t('missingToken.code.envExample') }}</code>
          </template>
          <template #env>
            <code class="code">{{ t('missingToken.code.env') }}</code>
          </template>
          <template #variable>
            <code class="code">{{ t('missingToken.code.variable') }}</code>
          </template>
        </I18nT>
        <I18nT
          keypath="missingToken.stepRestart"
          tag="li"
          scope="global"
        >
          <template #command>
            <code class="code">{{ t('missingToken.code.command') }}</code>
          </template>
        </I18nT>
      </ol>

      <I18nT
        v-if="links.liveDemo"
        keypath="missingToken.demo"
        tag="p"
        scope="global"
      >
        <template #link>
          <a
            class="underline"
            :href="links.liveDemo"
          >{{ t('missingToken.demoLink') }}</a>
        </template>
      </I18nT>
    </section>
  </main>
</template>

<script setup lang="ts">
import { I18nT, useI18n } from 'vue-i18n'
import { links } from '@/config'

const { t } = useI18n()
</script>

<style scoped>
@reference "@/assets/main.css";

.code {
  @apply rounded bg-surface-muted px-1 py-0.5 font-mono text-sm;
}
</style>
