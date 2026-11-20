<template>
  <div
    ref="root"
    :class="open && 'menu-open'"
    @keydown.esc="close(true)"
    @focusout="onFocusout"
  >
    <div
      v-if="open"
      class="fixed inset-0"
      aria-hidden="true"
      @click="close(false)"
    />
    <button
      type="button"
      class="glass relative flex h-10 items-center gap-2 rounded-full pr-3 pl-3.5 text-body-s font-semibold text-text-primary"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-controls="listId"
      :aria-label="t('layers.menuLabel', { layer: t(`layers.${store.activeLayer}`) })"
      @click="open ? close(false) : show()"
      @keydown.down.prevent="show()"
      @keydown.up.prevent="show()"
    >
      <AppIcon
        :name="store.activeLayer"
        :size="18"
      />
      {{ t(`layers.${store.activeLayer}`) }}
      <AppIcon
        name="chevronDown"
        :size="16"
        class="chevron text-control-muted"
        :class="open && 'rotate-180'"
      />
    </button>
    <Transition name="menu">
      <ul
        v-if="open"
        :id="listId"
        ref="list"
        role="listbox"
        :aria-label="t('layers.label')"
        class="glass absolute top-full left-0 mt-2 flex min-w-52 flex-col gap-0.5 rounded-lg p-1"
        @keydown="onListKeydown"
      >
        <li
          v-for="layer in LAYER_IDS"
          :key="layer"
          role="option"
          tabindex="-1"
          :aria-selected="layer === store.activeLayer"
          class="flex h-11 cursor-pointer items-center gap-3 rounded-md px-3 text-body-s font-semibold"
          :class="layer === store.activeLayer ? 'bg-text-primary text-text-inverse' : 'text-control hover:bg-surface-elevated'"
          @click="choose(layer)"
        >
          <AppIcon
            :name="layer"
            :size="18"
          />
          <span class="flex-1">{{ t(`layers.${layer}`) }}</span>
          <AppIcon
            v-if="layer === store.activeLayer"
            name="check"
            :size="18"
          />
        </li>
      </ul>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, useId, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import AppIcon from '@/components/ui/AppIcon.vue'
import { LAYER_IDS } from '@/domain/types'
import type { LayerId } from '@/domain/types'
import { useMapStore } from '@/stores/mapStore'

const { t } = useI18n()
const store = useMapStore()
const root = useTemplateRef<HTMLElement>('root')
const list = useTemplateRef<HTMLElement>('list')
const open = ref(false)
const listId = useId()

function options(): HTMLElement[] {
  return [...(list.value?.querySelectorAll<HTMLElement>('[role=option]') ?? [])]
}

/** Opens the list with focus on the active layer, so arrow keys work and screen readers announce it. */
async function show(): Promise<void> {
  open.value = true
  await nextTick()
  options()[LAYER_IDS.indexOf(store.activeLayer)]?.focus()
}

function close(returnFocus: boolean): void {
  if (!open.value) {
    return
  }
  open.value = false
  if (returnFocus) {
    root.value?.querySelector('button')?.focus()
  }
}

/** Switching layers only redraws from cached data: no requests. */
function choose(layer: LayerId): void {
  store.setLayer(layer)
  close(true)
}

/** Listbox keys: ↑ ↓ Home End move, Enter or Space picks, Tab leaves (and closes via focusout). */
function onListKeydown(event: KeyboardEvent): void {
  const items = options()
  const index = items.findIndex(item => item === document.activeElement)
  const move: Record<string, number> = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: items.length - 1 }
  const target = move[event.key]
  if (target !== undefined) {
    event.preventDefault()
    items[Math.min(Math.max(target, 0), items.length - 1)]?.focus()
  }
  else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    const layer = LAYER_IDS[index]
    if (layer) {
      choose(layer)
    }
  }
}

/** Closes when keyboard focus moves elsewhere; taps outside land on the backdrop instead, so they don't reach the map. */
function onFocusout(event: FocusEvent): void {
  const next = event.relatedTarget
  if (next instanceof Node && !root.value?.contains(next)) {
    close(false)
  }
}
</script>

<style scoped>
@reference "@/assets/main.css";

/* Above status messages while open. */
.menu-open {
  z-index: calc(var(--z-toast) + 1);
}

.chevron {
  transition: transform var(--duration-panel) var(--ease-standard);
}

.menu-enter-active,
.menu-leave-active {
  transition: opacity var(--duration-panel) var(--ease-standard), transform var(--duration-panel) var(--ease-standard);
}

.menu-enter-from,
.menu-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
