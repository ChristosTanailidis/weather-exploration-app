<template>
  <div
    ref="root"
    :class="fullScreen ? 'fixed inset-0 flex flex-col bg-surface-panel-solid' : 'relative'"
  >
    <div :class="fullScreen ? 'flex items-center gap-1 pt-13 pr-3 pb-2.5 pl-1' : ''">
      <button
        v-if="fullScreen"
        type="button"
        class="flex size-11 flex-none items-center justify-center rounded-md text-control"
        :aria-label="t('search.close')"
        @click="close"
      >
        <AppIcon
          name="back"
          :size="22"
        />
      </button>
      <div
        class="field"
        :class="[open ? 'field-open' : 'glass', fullScreen && 'flex-1']"
      >
        <label
          :for="inputId"
          class="flex text-text-secondary"
        >
          <AppIcon name="search" />
          <span class="sr-only">{{ t('search.label') }}</span>
        </label>
        <input
          :id="inputId"
          ref="input"
          v-model="query"
          type="search"
          role="combobox"
          autocomplete="off"
          spellcheck="false"
          class="h-11 min-w-0 flex-1 bg-transparent text-[16px] text-text-primary outline-none placeholder:text-text-tertiary lg:text-[15px]"
          :placeholder="isDesktop ? t('search.placeholder') : t('search.placeholderShort')"
          aria-autocomplete="list"
          :aria-expanded="showPanel"
          :aria-controls="listboxId"
          :aria-activedescendant="activeId"
          :aria-busy="state.status === 'loading'"
          @focus="open = true"
          @keydown="onKeydown"
        >
        <button
          v-if="query"
          type="button"
          class="flex size-9 flex-none items-center justify-center rounded-sm text-text-secondary hover:text-text-primary"
          :aria-label="t('search.clear')"
          @click="clearAndFocus"
        >
          <AppIcon
            name="close"
            :size="18"
          />
        </button>
        <kbd
          v-else-if="isDesktop"
          class="mr-0.5 rounded-[6px] border border-border-strong px-1.75 py-0.5 font-sans text-caption font-semibold text-text-secondary"
          aria-hidden="true"
        >{{ t('search.shortcut') }}</kbd>
      </div>
    </div>

    <div
      v-if="showPanel"
      :class="fullScreen ? 'flex-1 overflow-y-auto overscroll-contain' : 'absolute inset-x-0 top-14 overflow-hidden rounded-lg border border-border-strong bg-surface-elevated shadow-popover'"
    >
      <div
        v-if="state.status === 'hint'"
        role="status"
        class="message"
      >
        <span class="text-text-secondary"><AppIcon name="info" /></span>
        <div class="flex flex-col gap-1">
          <span class="text-body-s font-semibold">{{ t('search.hintTitle') }}</span>
          <span class="text-label font-normal text-text-secondary">{{ t('search.hint') }}</span>
        </div>
      </div>

      <ul
        v-else-if="state.status === 'loading'"
        :id="listboxId"
        role="listbox"
        :aria-label="t('search.loadingResults')"
        class="py-1.5"
      >
        <li
          v-for="row in SKELETON_ROWS"
          :key="row"
          class="flex h-13 items-center gap-3 px-3.5"
          aria-hidden="true"
        >
          <span class="skeleton block h-3.75 w-5.5 rounded-[2px]" />
          <span class="flex flex-col gap-1.75">
            <span class="skeleton block h-3 w-30 rounded-[6px]" />
            <span class="skeleton block h-2.5 w-37.5 rounded-[6px]" />
          </span>
        </li>
        <li class="sr-only">
          {{ t('search.searching') }}
        </li>
      </ul>

      <div
        v-else-if="state.status === 'error'"
        role="alert"
        class="message"
      >
        <span class="text-danger"><AppIcon name="warning" /></span>
        <div class="flex flex-1 flex-col gap-1">
          <span class="text-body-s font-semibold">{{ t('search.errorTitle') }}</span>
          <span class="text-label leading-normal font-normal text-text-secondary">{{ t('search.error') }}</span>
          <div class="mt-2">
            <button
              type="button"
              class="inline-flex h-9 items-center gap-2 rounded-[12px] border border-border-strong bg-text-secondary/12 px-3 text-body-s font-semibold"
              @click="retry"
            >
              <AppIcon
                name="refresh"
                :size="18"
              />
              {{ t('search.retry') }}
            </button>
          </div>
        </div>
      </div>

      <template v-else-if="state.status === 'success'">
        <div
          v-if="state.results.length === 0"
          role="status"
          class="message"
        >
          <span class="text-text-secondary"><AppIcon name="search" /></span>
          <div class="flex flex-col gap-1">
            <span class="text-body-s font-semibold">{{ t('search.emptyTitle', { query: query.trim() }) }}</span>
            <span class="text-label leading-normal font-normal text-text-secondary">{{ t('search.empty') }}</span>
          </div>
        </div>
        <template v-else>
          <ul
            :id="listboxId"
            role="listbox"
            :aria-label="t('search.results')"
            :class="!fullScreen && 'py-1.5'"
          >
            <li
              v-for="(result, i) in state.results"
              :id="optionId(i)"
              :key="result.id"
              role="option"
              :aria-selected="i === active"
              class="flex cursor-pointer items-center gap-3 px-3.5"
              :class="[fullScreen ? 'h-15 border-b border-border/50 px-4' : 'h-13', i === active && 'bg-text-secondary/12']"
              @mousedown.prevent
              @mousemove="active = i"
              @click="select(result)"
            >
              <FlagIcon
                :country-code="result.countryCode"
                :country="result.country"
              />
              <span class="flex min-w-0 flex-col gap-0.5">
                <span class="truncate text-[15px]">
                  <template
                    v-for="(part, p) in highlightMatch(result.name, query)"
                    :key="p"
                  >
                    <strong
                      v-if="part.match"
                      class="font-bold text-text-primary"
                    >{{ part.text }}</strong>
                    <span
                      v-else
                      class="font-medium text-control"
                    >{{ part.text }}</span>
                  </template>
                </span>
                <span class="truncate text-[12.5px] text-text-secondary">{{ region(result) }}</span>
              </span>
            </li>
          </ul>
          <div
            v-if="isDesktop"
            class="flex gap-3.5 border-t border-border px-3.5 py-2.5 text-caption font-normal text-text-tertiary"
            aria-hidden="true"
          >
            <span><kbd class="font-sans text-control">↑ ↓</kbd> {{ t('search.keyMove') }}</span>
            <span><kbd class="font-sans text-control">Enter</kbd> {{ t('search.keyOpen') }}</span>
            <span><kbd class="font-sans text-control">Esc</kbd> {{ t('search.keyClose') }}</span>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onClickOutside, useEventListener } from '@vueuse/core'
import { computed, ref, useId, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppIcon from '@/components/ui/AppIcon.vue'
import FlagIcon from '@/components/ui/FlagIcon.vue'
import { useIsDesktop } from '@/composables/useLayout'
import { usePlaceSearch } from '@/composables/usePlaceSearch'
import { useSearchFocus } from '@/composables/useSearchFocus'
import { highlightMatch } from '@/domain/search'
import type { SearchResult } from '@/domain/types'

const emit = defineEmits<{ select: [result: SearchResult] }>()

const SKELETON_ROWS = [1, 2, 3, 4]

const { t } = useI18n()
const isDesktop = useIsDesktop()
const { query, state, retry, clear } = usePlaceSearch()
const root = useTemplateRef<HTMLDivElement>('root')
const input = useTemplateRef<HTMLInputElement>('input')
const inputId = useId()
const listboxId = useId()
const open = ref(false)
const active = ref(-1)

const fullScreen = computed(() => !isDesktop.value && open.value)
const showPanel = computed(() => open.value && state.value.status !== 'idle')
const results = computed(() => (state.value.status === 'success' ? state.value.results : []))
const optionId = (i: number): string => `${listboxId}-option-${i}`
const activeId = computed(() => (showPanel.value && active.value >= 0 && active.value < results.value.length ? optionId(active.value) : undefined))

const region = (result: SearchResult): string =>
  result.admin1 ? t('search.region', { admin1: result.admin1, country: result.country }) : result.country

watch(state, () => {
  active.value = -1
})

const { requests: focusRequests } = useSearchFocus()
watch(focusRequests, () => {
  input.value?.focus()
})

function close(): void {
  open.value = false
  input.value?.blur()
}

function clearAndFocus(): void {
  clear()
  input.value?.focus()
}

function select(result: SearchResult): void {
  emit('select', result)
  clear()
  close()
}

function onKeydown(event: KeyboardEvent): void {
  const count = results.value.length
  switch (event.key) {
    case 'ArrowDown':
      if (count > 0) {
        event.preventDefault()
        open.value = true
        active.value = (active.value + 1) % count
      }
      break
    case 'ArrowUp':
      if (count > 0) {
        event.preventDefault()
        active.value = (active.value - 1 + count) % count
      }
      break
    case 'Enter': {
      const result = results.value[Math.max(0, active.value)]
      if (result) {
        event.preventDefault()
        select(result)
      }
      break
    }
    case 'Escape':
      event.preventDefault()
      if (showPanel.value && isDesktop.value) {
        open.value = false
      }
      else if (query.value) {
        clear()
      }
      else {
        close()
      }
      break
    case 'Tab':
      open.value = false
      break
  }
}

onClickOutside(root, () => {
  if (isDesktop.value) {
    open.value = false
  }
})

const isTyping = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

/** "/" focuses search from anywhere outside a text field. */
useEventListener(window, 'keydown', (event: KeyboardEvent) => {
  if (event.key === '/' && !event.ctrlKey && !event.metaKey && !isTyping(event.target)) {
    event.preventDefault()
    input.value?.focus()
  }
})
</script>

<style scoped>
@reference "@/assets/main.css";

.field {
  @apply flex h-12 items-center gap-2.5 rounded-lg pr-1.5 pl-3.5;
}

.field-open {
  @apply border border-border-strong bg-surface-overlay;
}

.field:has(input:focus-visible) {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.message {
  @apply flex gap-3 p-4;
}
</style>
