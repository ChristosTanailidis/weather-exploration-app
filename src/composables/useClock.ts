import { useIntervalFn } from '@vueuse/core'
import { readonly, shallowRef } from 'vue'
import { config } from '@/config'

const nowMs = shallowRef(Date.now())
let started = false

/** A shared clock that ticks every `clockTickMs` (not every frame). */
export function useClock() {
  if (!started) {
    started = true
    useIntervalFn(() => {
      nowMs.value = Date.now()
    }, config.clockTickMs)
  }
  return readonly(nowMs)
}
