import { useDebounceFn } from '@vueuse/core'
import { ref, shallowRef, watch } from 'vue'
import { weatherService } from '@/api/weatherService'
import { config } from '@/config'
import type { SearchResult } from '@/domain/types'

export type SearchState =
  | { status: 'idle' }
  | { status: 'hint' }
  | { status: 'loading' }
  | { status: 'success', results: readonly SearchResult[] }
  | { status: 'error', error: unknown }

const isAbort = (error: unknown): boolean => error instanceof DOMException && error.name === 'AbortError'

/**
 * Place search by name. Requests go out only after typing pauses for
 * `searchDebounceMs`, need at least `searchMinChars` letters, and abort the
 * previous request; the weather service caches results for the session.
 */
export function usePlaceSearch() {
  const query = ref('')
  const state = shallowRef<SearchState>({ status: 'idle' })
  let controller: AbortController | null = null

  async function search(text: string): Promise<void> {
    controller?.abort()
    const current = new AbortController()
    controller = current
    try {
      const results = await weatherService.searchPlaces(text, current.signal)
      if (controller === current) {
        state.value = { status: 'success', results }
      }
    }
    catch (error) {
      if (controller === current && !isAbort(error)) {
        state.value = { status: 'error', error }
      }
    }
  }

  const debouncedSearch = useDebounceFn((text: string) => search(text), config.searchDebounceMs)

  watch(query, (value) => {
    const text = value.trim()
    controller?.abort()
    controller = null
    if (text.length === 0) {
      state.value = { status: 'idle' }
    }
    else if (text.length < config.searchMinChars) {
      state.value = { status: 'hint' }
    }
    else {
      state.value = { status: 'loading' }
      void debouncedSearch(text)
    }
  })

  function retry(): void {
    const text = query.value.trim()
    if (text.length >= config.searchMinChars) {
      state.value = { status: 'loading' }
      void search(text)
    }
  }

  function clear(): void {
    query.value = ''
  }

  return { query, state, retry, clear }
}
