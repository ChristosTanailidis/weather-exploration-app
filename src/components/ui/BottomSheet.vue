<template>
  <Transition name="sheet">
    <div
      v-if="open"
      class="pointer-events-none fixed inset-0 z-(--z-overlay)"
    >
      <Transition name="scrim">
        <div
          v-if="expanded"
          class="pointer-events-auto absolute inset-0 bg-black/55"
          aria-hidden="true"
          @click="expanded = false"
        />
      </Transition>
      <section
        ref="sheet"
        v-bind="$attrs"
        class="sheet-panel pointer-events-auto absolute inset-x-0 top-12 bottom-0 flex flex-col rounded-t-[22px] border border-b-0 border-border bg-surface-panel shadow-sheet"
        :class="{ expanded, dragging, 'touch-none': !expanded }"
        :style="{ '--sheet-drag': `${dragPx}px` }"
        :aria-label="label"
        @pointerdown="handlers.onPointerdown"
        @pointermove="handlers.onPointermove"
        @pointerup="handlers.onPointerup"
        @pointercancel="handlers.onPointercancel"
        @touchmove="handlers.onTouchmove"
        @click.capture="handlers.onClickCapture"
      >
        <button
          type="button"
          data-sheet-grabber
          class="block h-6 w-full flex-none touch-none"
          :aria-label="expanded ? collapseLabel : expandLabel"
          :aria-expanded="expanded"
          @click="expanded = !expanded"
        >
          <span class="mx-auto mt-2 block h-1.25 w-10 rounded-[3px] bg-control/35" />
        </button>
        <slot />
      </section>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { useSheetDrag } from '@/composables/useSheetDrag'
import { config } from '@/config'
import { settleSheet } from '@/domain/sheet'

/** Attributes and listeners such as Esc go to the sheet, not the full-screen layer around it. */
defineOptions({ inheritAttrs: false })

const { open, label, expandLabel, collapseLabel } = defineProps<{
  open: boolean
  label: string
  expandLabel: string
  collapseLabel: string
}>()
const expanded = defineModel<boolean>('expanded', { required: true })
const emit = defineEmits<{ dismiss: [] }>()
const sheet = useTemplateRef<HTMLElement>('sheet')

/** Sheet height and how far down it sits at the peek height (it moves with a transform, never resizes). */
function measure(): { heightPx: number, peekOffsetPx: number } {
  const element = sheet.value
  if (!element) {
    return { heightPx: 0, peekOffsetPx: 0 }
  }
  const peekPx = Number.parseFloat(getComputedStyle(element).getPropertyValue('--sheet-peek')) || 0
  return { heightPx: element.offsetHeight, peekOffsetPx: Math.max(0, element.offsetHeight - peekPx) }
}

/**
 * At the peek height the whole sheet is a handle (nothing scrolls there); expanded, drags start on the grabber
 * or on content marked `data-sheet-handle` (the header), so the details can scroll.
 */
const { dragPx, dragging, handlers } = useSheetDrag({
  canStart: target => !expanded.value || target.closest('[data-sheet-grabber], [data-sheet-handle]') !== null,
  minOffsetPx: () => (expanded.value ? 0 : -measure().peekOffsetPx),
  onRelease: (dyPx, velocityPxPerMs) => {
    const { heightPx, peekOffsetPx } = measure()
    const from = expanded.value ? 'expanded' : 'peek'
    const target = settleSheet(
      [
        { id: 'expanded', offsetPx: 0 },
        { id: 'peek', offsetPx: peekOffsetPx },
        { id: 'dismiss', offsetPx: heightPx },
      ],
      from,
      { offsetPx: (expanded.value ? 0 : peekOffsetPx) + dyPx, velocityPxPerMs },
      { projectionMs: config.sheetProjectionMs, flickPxPerMs: config.sheetFlickPxPerMs },
    )
    if (target === 'dismiss') {
      emit('dismiss')
    }
    else {
      expanded.value = target === 'expanded'
    }
  },
})
</script>

<style scoped>
@reference "@/assets/main.css";

/* Always full height; the peek height is a downward offset, so every change animates as a transform. */
.sheet-panel {
  --sheet-base: calc(100% - var(--sheet-peek));
  backdrop-filter: blur(var(--blur-overlay));
  transform: translateY(calc(var(--sheet-base) + var(--sheet-drag, 0px)));
  transition: transform var(--duration-panel) var(--ease-standard);
}

.sheet-panel.expanded {
  --sheet-base: 0px;
}

/* No blur while following the finger: behind a 97% opaque panel it barely shows, and it is costly per frame. */
.sheet-panel.dragging {
  transition: none;
  backdrop-filter: none;
}

.sheet-enter-active,
.sheet-leave-active,
.scrim-enter-active,
.scrim-leave-active {
  transition: opacity var(--duration-panel) var(--ease-standard);
}

.sheet-enter-from,
.sheet-leave-to,
.scrim-enter-from,
.scrim-leave-to {
  opacity: 0;
}

/* After `.dragging`: a sheet swiped away keeps sliding from where the finger left it. */
.sheet-enter-active .sheet-panel,
.sheet-leave-active .sheet-panel {
  transition: transform var(--duration-panel) var(--ease-standard);
}

.sheet-enter-from .sheet-panel,
.sheet-leave-to .sheet-panel {
  transform: translateY(100%);
}
</style>
