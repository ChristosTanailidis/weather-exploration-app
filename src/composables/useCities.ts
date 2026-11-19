import { computed, readonly, shallowRef } from 'vue'
import { loadCities } from '@/api/cities'
import type { AsyncState, City } from '@/domain/types'

const state = shallowRef<AsyncState<readonly City[]>>({ status: 'idle' })

async function load(): Promise<readonly City[]> {
  const current = state.value
  if (current.status === 'success') {
    return current.data
  }
  if (current.status !== 'loading') {
    state.value = { status: 'loading' }
  }
  try {
    const data = await loadCities()
    state.value = { status: 'success', data }
    return data
  }
  catch (error) {
    state.value = { status: 'error', error }
    throw error
  }
}

/**
 * The static city dataset, lazy-loaded on first use and shared app-wide.
 * `cities` is empty until the load succeeds; `ready()` resolves with the data.
 */
export function useCities() {
  if (state.value.status === 'idle') {
    load().catch(() => undefined)
  }
  return {
    state: readonly(state),
    cities: computed<readonly City[]>(() => (state.value.status === 'success' ? state.value.data : [])),
    ready: load,
  }
}
