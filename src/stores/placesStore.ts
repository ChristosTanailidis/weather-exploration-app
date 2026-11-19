import { useLocalStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { config } from '@/config'
import { sanitizePlaces } from '@/domain/places'
import type { Place } from '@/domain/types'

const COLLECTION_STORAGE_KEY = 'wxe.places'

function readPlaces(raw: string): Place[] {
  try {
    return sanitizePlaces(JSON.parse(raw))
  }
  catch {
    return []
  }
}

/** The selected place, the user's collection (persisted) and the compare set. */
export const usePlacesStore = defineStore('places', () => {
  const selected = ref<Place | null>(null)
  const collection = useLocalStorage<Place[]>(COLLECTION_STORAGE_KEY, [], {
    serializer: { read: readPlaces, write: places => JSON.stringify(places) },
  })
  const compareKeys = ref<string[]>([])

  const savedKeys = computed(() => new Set(collection.value.map(place => place.key)))
  const comparePlaces = computed(() =>
    compareKeys.value
      .map(key => collection.value.find(place => place.key === key))
      .filter((place): place is Place => place !== undefined))
  const canCompare = computed(() => comparePlaces.value.length >= config.compareMin)

  function select(place: Place | null): void {
    selected.value = place
  }

  function isSaved(key: string): boolean {
    return savedKeys.value.has(key)
  }

  function add(place: Place): void {
    if (!isSaved(place.key)) {
      collection.value = [...collection.value, { ...place }]
    }
  }

  function remove(key: string): void {
    collection.value = collection.value.filter(place => place.key !== key)
    compareKeys.value = compareKeys.value.filter(k => k !== key)
  }

  function toggleSaved(place: Place): void {
    if (isSaved(place.key)) {
      remove(place.key)
    }
    else {
      add(place)
    }
  }

  /** Moves a saved place to `index` (clamped). */
  function move(key: string, index: number): void {
    const from = collection.value.findIndex(place => place.key === key)
    const place = collection.value[from]
    if (!place) {
      return
    }
    const next = collection.value.filter(p => p.key !== key)
    const to = Math.min(next.length, Math.max(0, index))
    next.splice(to, 0, place)
    collection.value = next
  }

  /** Adds or removes a saved place from the compare set (up to `compareMax`). */
  function toggleCompare(key: string): boolean {
    if (compareKeys.value.includes(key)) {
      compareKeys.value = compareKeys.value.filter(k => k !== key)
      return true
    }
    if (!isSaved(key) || compareKeys.value.length >= config.compareMax) {
      return false
    }
    compareKeys.value = [...compareKeys.value, key]
    return true
  }

  function clearCompare(): void {
    compareKeys.value = []
  }

  return {
    selected,
    collection,
    compareKeys,
    comparePlaces,
    canCompare,
    select,
    isSaved,
    add,
    remove,
    toggleSaved,
    move,
    toggleCompare,
    clearCompare,
  }
})
