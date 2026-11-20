<template>
  <li
    class="relative flex min-h-17 items-center gap-1 rounded-[14px] p-1.5"
    :class="[comparing && 'bg-text-secondary/6', dragging && 'opacity-50']"
    :draggable="movable"
    @dragstart="onDragStart"
    @dragend="emit('dragEnd')"
    @dragover.prevent
    @drop.prevent="emit('dropOn')"
  >
    <button
      v-if="movable"
      type="button"
      class="flex h-11 w-7 flex-none cursor-grab items-center justify-center text-text-tertiary"
      :aria-label="t('myPlaces.reorder', { name: title })"
      @keydown.up.prevent="emit('move', -1)"
      @keydown.down.prevent="emit('move', 1)"
      @pointerdown="handlePressed = true"
      @pointerup="handlePressed = false"
    >
      <AppIcon
        name="grip"
        :size="18"
      />
    </button>
    <span
      v-else
      class="flex h-11 w-7 flex-none items-center justify-center text-location"
      aria-hidden="true"
    >
      <AppIcon
        name="location"
        :size="18"
      />
    </span>
    <button
      type="button"
      role="checkbox"
      class="flex size-11 flex-none items-center justify-center disabled:cursor-not-allowed"
      :aria-checked="comparing"
      :aria-label="t('myPlaces.select', { name: title })"
      :disabled="!comparing && !canSelect"
      @click="emit('toggleCompare')"
    >
      <span
        class="flex size-5.5 items-center justify-center rounded-[6px] text-text-inverse"
        :class="comparing ? '' : canSelect ? 'border-2 border-border-strong' : 'border-2 border-border'"
        :style="comparing ? { background: compareColor } : undefined"
      >
        <AppIcon
          v-if="comparing"
          name="check"
          :size="14"
        />
      </span>
    </button>
    <WeatherIcon
      v-if="summary"
      :icon="summary.icon"
      :alt="t(summary.labelKey)"
      :size="34"
      :animated="false"
    />
    <span
      v-else
      class="skeleton block size-8.5 flex-none rounded-full"
      aria-hidden="true"
    />
    <button
      type="button"
      class="flex min-w-0 flex-1 flex-col gap-0.75 rounded-sm px-1.5 py-1 text-left"
      @click="emit('open')"
    >
      <span
        v-if="!movable"
        class="text-micro font-semibold tracking-[0.06em] text-location uppercase"
      >{{ t('myPlaces.youAreHere') }}</span>
      <span class="truncate text-[15px] font-semibold">{{ title }}</span>
      <span
        v-if="place.countryCode"
        class="flex items-center gap-1.5 truncate text-caption font-normal text-text-secondary"
      >
        <FlagIcon
          :country-code="place.countryCode"
          :country="place.country"
          :width="16"
        />
        <span class="truncate">{{ place.country || countryName(place.countryCode) }}</span>
      </span>
    </button>
    <div class="flex w-16 flex-none flex-col items-end gap-1">
      <template v-if="summary">
        <span class="font-display text-[22px] leading-none font-medium">{{ temp(summary.tempC, true) }}</span>
        <span
          class="text-caption font-normal whitespace-nowrap text-text-secondary tabular-nums"
          :aria-label="t('myPlaces.rangeLabel', { min: temp(summary.minC, true), max: temp(summary.maxC, true) })"
        >{{ t('myPlaces.range', { min: temp(summary.minC, true), max: temp(summary.maxC, true) }) }}</span>
      </template>
      <template v-else>
        <span class="skeleton block h-5.5 w-10 rounded-[6px]" />
        <span class="skeleton block h-3 w-14 rounded-[6px]" />
      </template>
    </div>
    <div
      v-if="movable"
      class="relative flex-none"
    >
      <button
        ref="menuButton"
        type="button"
        class="flex size-11 items-center justify-center rounded-md text-control"
        :class="menuOpen && 'bg-text-secondary/14'"
        :aria-label="t('myPlaces.more', { name: title })"
        aria-haspopup="menu"
        :aria-expanded="menuOpen"
        @click="menuOpen = !menuOpen"
      >
        <AppIcon name="more" />
      </button>
      <div
        v-if="menuOpen"
        ref="menu"
        role="menu"
        :aria-label="t('myPlaces.actions', { name: title })"
        class="absolute top-12 right-0 z-10 flex w-55 flex-col rounded-[12px] border border-border-strong bg-surface-elevated p-1.5 shadow-popover"
        @keydown.esc.stop="closeMenu"
      >
        <button
          v-for="item in menuItems"
          :key="item.label"
          type="button"
          role="menuitem"
          class="flex h-10 items-center gap-2.5 rounded-sm px-3 text-left text-body-s hover:bg-text-secondary/12 disabled:text-text-tertiary disabled:hover:bg-transparent"
          :class="item.danger && 'text-danger'"
          :disabled="item.disabled"
          @click="item.run(); closeMenu()"
        >
          <AppIcon
            :name="item.icon"
            :size="18"
          />
          {{ item.label }}
        </button>
      </div>
    </div>
    <span
      v-else
      class="w-11 flex-none"
    />
  </li>
</template>

<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppIcon from '@/components/ui/AppIcon.vue'
import FlagIcon from '@/components/ui/FlagIcon.vue'
import type { IconName } from '@/components/ui/iconPaths'
import WeatherIcon from '@/components/ui/WeatherIcon.vue'
import { useFormat } from '@/composables/useFormat'
import type { PlaceSummary } from '@/domain/collection'
import type { Place } from '@/domain/types'

const { place, summary, movable, comparing, canSelect, compareColor = '', isFirst, isLast, dragging } = defineProps<{
  place: Place
  summary: PlaceSummary | null
  /** Saved places can be reordered and removed; "You are here" can't. */
  movable: boolean
  comparing: boolean
  canSelect: boolean
  compareColor?: string
  isFirst: boolean
  isLast: boolean
  dragging: boolean
}>()
const emit = defineEmits<{
  open: []
  move: [delta: number]
  remove: []
  toggleCompare: []
  dragStart: []
  dragEnd: []
  dropOn: []
}>()

const { t } = useI18n()
const { temp, placeTitle, countryName } = useFormat()
const title = computed(() => placeTitle(place))
const menuOpen = ref(false)
const handlePressed = ref(false)
const menu = useTemplateRef<HTMLDivElement>('menu')
const menuButton = useTemplateRef<HTMLButtonElement>('menuButton')

const menuItems = computed<{ label: string, icon: IconName, run: () => void, disabled?: boolean, danger?: boolean }[]>(() => [
  { label: t('myPlaces.open'), icon: 'chevronRight', run: () => emit('open') },
  { label: t('myPlaces.moveUp'), icon: 'arrowUp', run: () => emit('move', -1), disabled: isFirst },
  { label: t('myPlaces.moveDown'), icon: 'arrowDown', run: () => emit('move', 1), disabled: isLast },
  { label: t('myPlaces.remove'), icon: 'close', run: () => emit('remove'), danger: true },
])

function closeMenu(): void {
  menuOpen.value = false
  void nextTick(() => menuButton.value?.focus())
}

watch(menuOpen, async (open) => {
  if (open) {
    await nextTick()
    menu.value?.querySelector<HTMLButtonElement>('[role=menuitem]:not(:disabled)')?.focus()
  }
})

onClickOutside(menu, () => {
  menuOpen.value = false
}, { ignore: [menuButton] })

/** Only the handle starts a drag, so text and buttons stay usable. */
function onDragStart(event: DragEvent): void {
  if (!handlePressed.value) {
    event.preventDefault()
    return
  }
  event.dataTransfer?.setData('text/plain', place.key)
  emit('dragStart')
}
</script>
