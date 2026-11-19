import { useDocumentVisibility } from '@vueuse/core'
import { shallowRef, watch } from 'vue'
import { weatherService } from '@/api/weatherService'
import type { Cached } from '@/api/weatherService'
import { useForecastTime } from '@/composables/useForecastTime'
import { config } from '@/config'
import { isOnVisibleHemisphere, pointKey, snapGrid } from '@/domain/geo'
import type { GridCell } from '@/domain/geo'
import type { HourlySeries } from '@/domain/types'
import { useMapStore } from '@/stores/mapStore'

/** Cache key of a grid cell: its snapped centre, like any free point. */
export const gridCellKey = (cell: GridCell): string => pointKey(cell, config.coordPrecision)

/**
 * Weather for a coarse lat/lon grid over the view. Cells sit on a fixed
 * global lattice whose step depends on zoom, so overlapping views reuse
 * cached cells; at most `gridMaxPoints` cells go out in one batched request.
 */
export function useGridWeather() {
  const store = useMapStore()
  const cells = shallowRef<readonly GridCell[]>([])
  const weather = shallowRef<ReadonlyMap<string, Cached<HourlySeries>>>(new Map())
  const error = shallowRef<unknown>(undefined)

  async function refresh(): Promise<void> {
    if (!store.bounds) {
      return
    }
    const center = store.view
    const next = snapGrid(store.bounds, store.view.zoom, {
      maxPoints: config.gridMaxPoints,
      center,
      isVisible: cell => isOnVisibleHemisphere(cell, center),
    })
    cells.value = next
    if (next.length === 0) {
      return
    }
    const result = await weatherService.getOverview(next.map(cell => ({ key: gridCellKey(cell), lat: cell.lat, lon: cell.lon })))
    weather.value = new Map([...weather.value, ...result.entries])
    error.value = result.error
  }

  watch(() => store.bounds, () => {
    void refresh()
  })

  const visibility = useDocumentVisibility()
  const { nowHourSec } = useForecastTime()
  watch([visibility, nowHourSec], ([state]) => {
    if (state === 'visible') {
      void refresh()
    }
  })

  return { cells, weather, error, refresh }
}
