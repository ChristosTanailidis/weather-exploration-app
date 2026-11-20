<template>
  <Transition name="drawer">
    <aside
      v-if="place && isDesktop && !places.listOpen"
      class="drawer absolute top-3 right-3 bottom-3 z-(--z-drawer) flex w-100 flex-col overflow-hidden rounded-[20px] border border-border bg-surface-panel shadow-panel"
      :aria-label="t('panel.label', { name: title })"
      @keydown.esc="close"
    >
      <PlaceHeader
        ref="header"
        :place="place"
        :forecast="forecast"
        @close="close"
      />
      <div
        class="min-h-0 flex-1 overflow-y-auto pb-6"
        tabindex="0"
        role="region"
        :aria-label="t('panel.details')"
        :aria-busy="state.status === 'loading'"
      >
        <PanelContent
          :state="state"
          :compact="false"
          @retry="retry"
        />
      </div>
    </aside>
  </Transition>
  <BottomSheet
    v-model:expanded="expanded"
    :open="!!place && !isDesktop && !places.listOpen"
    :label="t('panel.label', { name: title })"
    :expand-label="t('panel.expand')"
    :collapse-label="t('panel.collapse')"
    @dismiss="close"
    @keydown.esc="close"
  >
    <template v-if="place">
      <div
        data-sheet-handle
        class="touch-none"
      >
        <PlaceHeader
          ref="header"
          :place="place"
          :forecast="forecast"
          @close="close"
        />
      </div>
      <div
        class="min-h-0 flex-1 pb-6"
        :class="expanded ? 'overflow-y-auto' : 'overflow-hidden'"
        :tabindex="expanded ? 0 : undefined"
        role="region"
        :aria-label="t('panel.details')"
        :aria-busy="state.status === 'loading'"
      >
        <PanelContent
          :state="state"
          :compact="!expanded"
          @retry="retry"
        />
      </div>
    </template>
  </BottomSheet>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import PanelContent from '@/components/place/PanelContent.vue'
import PlaceHeader from '@/components/place/PlaceHeader.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import { useFormat } from '@/composables/useFormat'
import { useIsDesktop } from '@/composables/useLayout'
import { usePlaceForecast } from '@/composables/usePlaceForecast'
import { usePlacesStore } from '@/stores/placesStore'

const { t } = useI18n()
const places = usePlacesStore()
const { selected: place } = storeToRefs(places)
const { placeTitle } = useFormat()
const isDesktop = useIsDesktop()
const { state, retry } = usePlaceForecast(place)
const header = useTemplateRef<InstanceType<typeof PlaceHeader>>('header')
const expanded = ref(false)

const title = computed(() => (place.value ? placeTitle(place.value) : ''))
const forecast = computed(() => (state.value.status === 'success' ? state.value.data : null))

let opener: HTMLElement | null = null

/** Not modal: focus moves to the title on open and back to what opened it on close. */
watch(() => place.value?.key, async (key, previous) => {
  if (key && !previous) {
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
  }
  if (key) {
    expanded.value = false
    await nextTick()
    header.value?.focus()
  }
})

function close(): void {
  places.select(null)
  const target = opener
  opener = null
  void nextTick(() => target?.focus())
}
</script>

<style scoped>
@reference "@/assets/main.css";

.drawer-enter-active,
.drawer-leave-active {
  transition: transform var(--duration-panel) var(--ease-standard), opacity var(--duration-panel) var(--ease-standard);
}

.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(24px);
  opacity: 0;
}
</style>
