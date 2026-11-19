<template>
  <div class="flex min-h-full items-center justify-center bg-[radial-gradient(120%_90%_at_50%_120%,var(--color-surface-elevated)_0%,var(--color-surface-space)_60%)] p-4">
    <main class="flex w-full max-w-150 flex-col gap-6">
      <span class="flex size-14 items-center justify-center rounded-[16px] bg-focus/12 text-focus">
        <AppIcon
          name="globe"
          :size="28"
        />
      </span>
      <div class="flex flex-col gap-2.5">
        <h1 class="font-display text-[36px] leading-[1.15] font-semibold tracking-[-0.02em]">
          {{ t('missingToken.title') }}
        </h1>
        <p class="text-body-l font-normal text-text-secondary">
          {{ t('missingToken.intro') }}
        </p>
      </div>
      <ol
        class="flex flex-col gap-3.5"
        :aria-label="t('missingToken.steps')"
      >
        <li class="step">
          <span class="step-number">1</span>
          <span>{{ t('missingToken.stepToken') }}</span>
        </li>
        <li class="step">
          <span class="step-number">2</span>
          <span class="flex min-w-0 flex-col gap-2">
            <I18nT
              keypath="missingToken.stepEnv"
              tag="span"
              scope="global"
            >
              <template #file>
                <code class="font-mono text-[13.5px] text-text-primary">{{ t('missingToken.code.file') }}</code>
              </template>
            </I18nT>
            <code class="block rounded-md border border-border bg-surface-sunken px-3.5 py-3 font-mono text-[13.5px] text-accent">{{ t('missingToken.code.line') }}</code>
          </span>
        </li>
        <li class="step">
          <span class="step-number">3</span>
          <span>{{ t('missingToken.stepRestart') }}</span>
        </li>
      </ol>
      <div class="flex flex-wrap gap-3">
        <a
          v-if="links.liveDemo"
          :href="links.liveDemo"
          class="inline-flex h-11 items-center gap-2 rounded-[12px] bg-accent px-4.5 text-body-l text-text-on-accent hover:bg-accent-hover"
        >
          {{ t('missingToken.demo') }}
          <AppIcon
            name="external"
            :size="18"
          />
        </a>
        <a
          :href="links.mapboxGuide"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex h-11 items-center gap-2 rounded-[12px] border border-border-strong bg-text-secondary/12 px-4 text-body-l text-text-primary"
        >
          {{ t('missingToken.guide') }}
        </a>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { I18nT, useI18n } from 'vue-i18n'
import AppIcon from '@/components/ui/AppIcon.vue'
import { links } from '@/config'

const { t } = useI18n()
</script>

<style scoped>
@reference "@/assets/main.css";

.step {
  @apply flex gap-3.5 text-[15px] leading-[1.55] text-control;
}

.step-number {
  @apply flex size-6.5 flex-none items-center justify-center rounded-full bg-surface-card text-label;
}
</style>
