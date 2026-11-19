import { shallowRef } from 'vue'

const requests = shallowRef(0)

/** Lets other parts of the UI (e.g. "Search a place") move focus to search. */
export function useSearchFocus() {
  return {
    requests,
    requestFocus: (): void => {
      requests.value += 1
    },
  }
}
