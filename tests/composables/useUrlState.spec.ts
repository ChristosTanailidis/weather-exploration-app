import { createPinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import { createApp, nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useUrlState } from '@/composables/useUrlState'
import type { UrlStateOptions } from '@/composables/useUrlState'
import { useMapStore } from '@/stores/mapStore'
import { usePlacesStore } from '@/stores/placesStore'

async function setup(url: string, options: UrlStateOptions = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { render: () => null } }],
  })
  const app = createApp({ render: () => null }).use(createPinia()).use(router)
  await router.push(url)
  await router.isReady()
  app.runWithContext(() => useUrlState(options))
  const stores = app.runWithContext(() => ({ map: useMapStore(), places: usePlacesStore() }))
  await nextTick()
  await new Promise(resolve => setTimeout(resolve, 0))
  return { router, ...stores }
}

describe('useUrlState', () => {
  it('applies valid URL params to the stores', async () => {
    const { map } = await setup('/?v=40.64,22.94,5&layer=wind&t=6')
    expect(map.view).toEqual({ lat: 40.64, lon: 22.94, zoom: 5 })
    expect(map.activeLayer).toBe('wind')
    expect(map.timeIndex).toBe(6)
  })

  it('resolves the place param', async () => {
    const athens = { key: 'city:264371', kind: 'city' as const, name: 'Athens', lat: 37.98, lon: 23.73 }
    const { places } = await setup('/?place=city:264371', { resolvePlace: key => (key === athens.key ? athens : null) })
    expect(places.selected).toEqual(athens)
  })

  it('drops invalid params and keeps unrelated ones', async () => {
    const { router } = await setup('/?v=bad&layer=pressure&debug=1')
    expect(router.currentRoute.value.query).toEqual({ debug: '1' })
  })

  it('writes store changes back to the URL', async () => {
    const { router, map } = await setup('/?debug=1')
    map.setView({ lat: 10, lon: 20, zoom: 3 })
    map.setLayer('clouds')
    map.setTimeIndex(12)
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(router.currentRoute.value.query).toEqual({ debug: '1', v: '10,20,3', layer: 'clouds', t: '12' })
  })
})
