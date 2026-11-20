import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { config } from '@/config'
import type { Place } from '@/domain/types'
import { defaultUnitSystem } from '@/domain/units'
import { useMapStore } from '@/stores/mapStore'
import { usePlacesStore } from '@/stores/placesStore'
import { useSettingsStore } from '@/stores/settingsStore'

const place = (n: number): Place => ({ key: `city:${n}`, kind: 'city', name: `City ${n}`, lat: n, lon: n })

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('mapStore', () => {
  it('starts at the default view and layer', () => {
    const map = useMapStore()
    expect(map.view).toEqual(config.defaultView)
    expect(map.activeLayer).toBe('temperature')
    expect(map.timeIndex).toBe(0)
  })

  it('clamps the time index to the forecast window', () => {
    const map = useMapStore()
    map.setTimeIndex(-3)
    expect(map.timeIndex).toBe(0)
    map.setTimeIndex(999)
    expect(map.timeIndex).toBe(config.forecastHours - 1)
    map.setTimeIndex(4.6)
    expect(map.timeIndex).toBe(5)
    map.setTimeIndex(Number.NaN)
    expect(map.timeIndex).toBe(0)
  })
})

describe('placesStore', () => {
  it('adds places once and removes them', () => {
    const places = usePlacesStore()
    places.add(place(1))
    places.add(place(1))
    places.add(place(2))
    expect(places.collection.map(p => p.key)).toEqual(['city:1', 'city:2'])
    expect(places.isSaved('city:1')).toBe(true)
    places.toggleSaved(place(1))
    expect(places.isSaved('city:1')).toBe(false)
  })

  it('reorders places', () => {
    const places = usePlacesStore()
    ;[1, 2, 3].forEach(n => places.add(place(n)))
    places.move('city:3', 0)
    expect(places.collection.map(p => p.key)).toEqual(['city:3', 'city:1', 'city:2'])
    places.move('city:3', 99)
    expect(places.collection.map(p => p.key)).toEqual(['city:1', 'city:2', 'city:3'])
    places.move('city:404', 0)
    expect(places.collection).toHaveLength(3)
  })

  it('compares between compareMin and compareMax saved places', () => {
    const places = usePlacesStore()
    ;[1, 2, 3, 4, 5].forEach(n => places.add(place(n)))
    expect(places.toggleCompare('city:1')).toBe(true)
    expect(places.canCompare).toBe(false)
    places.toggleCompare('city:2')
    expect(places.canCompare).toBe(true)
    places.toggleCompare('city:3')
    places.toggleCompare('city:4')
    expect(places.toggleCompare('city:5')).toBe(false)
    expect(places.comparePlaces).toHaveLength(config.compareMax)
    expect(places.toggleCompare('city:404')).toBe(false)
  })

  it('drops removed places from the compare set', () => {
    const places = usePlacesStore()
    ;[1, 2].forEach(n => places.add(place(n)))
    places.toggleCompare('city:1')
    places.toggleCompare('city:2')
    places.remove('city:1')
    expect(places.compareKeys).toEqual(['city:2'])
  })
})

describe('settingsStore', () => {
  it('defaults to the browser locale', () => {
    expect(useSettingsStore().units).toBe(defaultUnitSystem(navigator.language))
  })

  it('toggles units', () => {
    const settings = useSettingsStore()
    settings.setUnits('metric')
    settings.toggleUnits()
    expect(settings.units).toBe('imperial')
    settings.toggleUnits()
    expect(settings.units).toBe('metric')
  })
})
