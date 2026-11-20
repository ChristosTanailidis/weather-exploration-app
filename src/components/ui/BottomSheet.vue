<template>
  <div
    v-if="expanded"
    class="fixed inset-0 z-(--z-overlay) bg-black/55"
    aria-hidden="true"
    @click="expanded = false"
  />
  <section
    class="sheet fixed inset-x-0 bottom-0 z-(--z-overlay) flex flex-col rounded-t-[22px] border border-b-0 border-border bg-surface-panel shadow-sheet"
    :class="expanded ? 'top-12' : 'h-(--sheet-peek)'"
    :aria-label="label"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
  >
    <button
      type="button"
      class="block h-6 w-full flex-none touch-none"
      :aria-label="expanded ? collapseLabel : expandLabel"
      :aria-expanded="expanded"
      @click="expanded = !expanded"
    >
      <span class="mx-auto mt-2 block h-1.25 w-10 rounded-[3px] bg-control/35" />
    </button>
    <slot />
  </section>
</template>

<script setup lang="ts">
const { label, expandLabel, collapseLabel } = defineProps<{
  label: string
  expandLabel: string
  collapseLabel: string
}>()
const expanded = defineModel<boolean>('expanded', { required: true })
const emit = defineEmits<{ dismiss: [] }>()

/** Drags shorter than this count as taps. */
const DRAG_THRESHOLD_PX = 40
let startY: number | null = null

/** Drags start on the grabber or on content marked `data-sheet-handle` (the header), never in scrolling content. */
function onPointerDown(event: PointerEvent): void {
  const target = event.target instanceof Element ? event.target : null
  const onHandle = target?.closest('.touch-none, [data-sheet-handle]')
  const onControl = target?.closest('[data-sheet-handle] button, [data-sheet-handle] a')
  startY = onHandle && !onControl ? event.clientY : null
}

/** Swipe up expands; swipe down collapses, or dismisses from the peek height. */
function onPointerUp(event: PointerEvent): void {
  if (startY === null) {
    return
  }
  const dy = event.clientY - startY
  startY = null
  if (dy < -DRAG_THRESHOLD_PX) {
    expanded.value = true
  }
  else if (dy > DRAG_THRESHOLD_PX) {
    if (expanded.value) {
      expanded.value = false
    }
    else {
      emit('dismiss')
    }
  }
}
</script>

<style scoped>
@reference "@/assets/main.css";

.sheet {
  backdrop-filter: blur(var(--blur-overlay));
  transition: top var(--duration-panel) var(--ease-standard), height var(--duration-panel) var(--ease-standard);
}
</style>
