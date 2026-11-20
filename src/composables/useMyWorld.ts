import { computed } from 'vue'
import { boundsOf } from '@/domain/collection'
import { useMapStore } from '@/stores/mapStore'
import { usePlacesStore } from '@/stores/placesStore'

/** "My world": fit the map to every saved place (and the user's location). */
export function useMyWorld() {
  const places = usePlacesStore()
  const map = useMapStore()
  const canShowMyWorld = computed(() => places.collection.length > 0)

  function showMyWorld(): void {
    const bounds = boundsOf(places.listPlaces)
    if (bounds) {
      map.fitTo(bounds)
    }
  }

  return { canShowMyWorld, showMyWorld }
}
