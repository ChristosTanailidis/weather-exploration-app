import { useLocalStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import { config } from '@/config'
import type { Cached } from '@/api/weatherService'
import { sanitizePlaces } from '@/domain/places'
import type { HourlySeries, Place } from '@/domain/types'

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
  /** The user's position as a place, once located. Never persisted. */
  const currentLocation = shallowRef<Place | null>(null)
  /** Overview weather for the current location and saved places, by key. */
  const collectionWeather = shallowRef<ReadonlyMap<string, Cached<HourlySeries>>>(new Map())
  /** Whether the My places list is open (it shares the drawer with the place panel). */
  const listOpen = ref(false)

  /** "You are here" first, then the saved places. */
  const listPlaces = computed(() => [
    ...(currentLocation.value && !savedKeys.value.has(currentLocation.value.key) ? [currentLocation.value] : []),
    ...collection.value,
  ])

  const savedKeys = computed(() => new Set(collection.value.map(place => place.key)))
  const comparePlaces = computed(() =>
    compareKeys.value
      .map(key => listPlaces.value.find(place => place.key === key))
      .filter((place): place is Place => place !== undefined))
  const canCompare = computed(() => comparePlaces.value.length >= config.compareMin)

  function select(place: Place | null): void {
    selected.value = place
    if (place) {
      listOpen.value = false
    }
  }

  function setListOpen(open: boolean): void {
    listOpen.value = open
  }

  function setCollectionWeather(entries: ReadonlyMap<string, Cached<HourlySeries>>): void {
    collectionWeather.value = new Map([...collectionWeather.value, ...entries])
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

  /** Moves a saved place up (-1) or down (+1). */
  function moveBy(key: string, delta: number): void {
    const index = collection.value.findIndex(place => place.key === key)
    if (index >= 0) {
      move(key, index + delta)
    }
  }

  /** Adds or removes a listed place from the compare set (up to `compareMax`). */
  function toggleCompare(key: string): boolean {
    if (compareKeys.value.includes(key)) {
      compareKeys.value = compareKeys.value.filter(k => k !== key)
      return true
    }
    const listed = listPlaces.value.some(place => place.key === key)
    if (!listed || compareKeys.value.length >= config.compareMax) {
      return false
    }
    compareKeys.value = [...compareKeys.value, key]
    return true
  }

  function clearCompare(): void {
    compareKeys.value = []
  }

  function setCurrentLocation(place: Place | null): void {
    currentLocation.value = place
  }

  return {
    selected,
    collection,
    compareKeys,
    currentLocation,
    collectionWeather,
    listOpen,
    listPlaces,
    comparePlaces,
    canCompare,
    select,
    isSaved,
    add,
    remove,
    toggleSaved,
    move,
    moveBy,
    setListOpen,
    setCollectionWeather,
    toggleCompare,
    clearCompare,
    setCurrentLocation,
  }
})
