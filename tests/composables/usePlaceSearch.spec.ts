import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick } from 'vue'
import { config } from '@/config'

const searchPlaces = vi.fn()
vi.mock('@/api/weatherService', () => ({ weatherService: { searchPlaces: (...args: unknown[]) => searchPlaces(...args) } }))

const { usePlaceSearch } = await import('@/composables/usePlaceSearch')

const athens = { id: 264371, name: 'Athens', lat: 37.98, lon: 23.73, countryCode: 'GR', country: 'Greece', admin1: 'Attica' }

function setup() {
  const scope = effectScope()
  const search = scope.run(() => usePlaceSearch())
  if (!search) throw new Error('scope did not run')
  return { ...search, stop: () => scope.stop() }
}

async function type(query: { value: string }, text: string, gapMs: number) {
  for (let i = 1; i <= text.length; i++) {
    query.value = text.slice(0, i)
    await nextTick()
    await vi.advanceTimersByTimeAsync(gapMs)
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  searchPlaces.mockReset()
  searchPlaces.mockResolvedValue([athens])
})

afterEach(() => {
  vi.useRealTimers()
})

describe('usePlaceSearch', () => {
  it('sends one request per pause while typing fast', async () => {
    const { query, state, stop } = setup()
    await type(query, 'Athens', 50)
    expect(searchPlaces).not.toHaveBeenCalled()
    expect(state.value.status).toBe('loading')
    await vi.advanceTimersByTimeAsync(config.searchDebounceMs)
    expect(searchPlaces).toHaveBeenCalledTimes(1)
    expect(searchPlaces).toHaveBeenCalledWith('Athens', expect.any(AbortSignal))
    expect(state.value).toEqual({ status: 'success', results: [athens] })
    stop()
  })

  it('asks for more letters below the minimum and sends nothing', async () => {
    const { query, state, stop } = setup()
    query.value = 'A'
    await nextTick()
    await vi.advanceTimersByTimeAsync(config.searchDebounceMs * 2)
    expect(state.value.status).toBe('hint')
    query.value = ''
    await nextTick()
    expect(state.value.status).toBe('idle')
    expect(searchPlaces).not.toHaveBeenCalled()
    stop()
  })

  it('aborts the previous request when the query changes', async () => {
    let firstSignal: AbortSignal | undefined
    searchPlaces.mockImplementationOnce((_q: string, signal: AbortSignal) => {
      firstSignal = signal
      return new Promise(() => undefined)
    })
    const { query, stop } = setup()
    query.value = 'Ath'
    await nextTick()
    await vi.advanceTimersByTimeAsync(config.searchDebounceMs)
    query.value = 'Athe'
    await nextTick()
    expect(firstSignal?.aborted).toBe(true)
    stop()
  })

  it('reports errors and can retry', async () => {
    searchPlaces.mockRejectedValueOnce(new Error('down'))
    const { query, state, retry, stop } = setup()
    query.value = 'Athens'
    await nextTick()
    await vi.advanceTimersByTimeAsync(config.searchDebounceMs)
    expect(state.value.status).toBe('error')
    retry()
    await vi.advanceTimersByTimeAsync(0)
    expect(state.value).toEqual({ status: 'success', results: [athens] })
    expect(searchPlaces).toHaveBeenCalledTimes(2)
    stop()
  })
})
