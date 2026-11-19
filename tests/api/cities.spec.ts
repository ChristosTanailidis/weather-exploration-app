import { beforeEach, describe, expect, it, vi } from 'vitest'

const validRow = [264371, 'Athens', 'GR', 'Attica', 37.98, 23.73, 664046]

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

async function freshModule() {
  vi.resetModules()
  return import('@/api/cities')
}

describe('parseCities', () => {
  it('maps rows to cities', async () => {
    const { parseCities } = await freshModule()
    expect(parseCities([validRow])).toEqual([
      { id: 264371, name: 'Athens', countryCode: 'GR', admin1: 'Attica', lat: 37.98, lon: 23.73, population: 664046 },
    ])
  })

  it('skips malformed rows', async () => {
    const { parseCities } = await freshModule()
    const rows = [
      validRow,
      [1, 'Short'],
      ['1', 'Wrong id', 'GR', '', 1, 2, 3],
      [2, 'No lat', 'GR', '', null, 2, 3],
      [3, 'Bad lon', 'GR', '', 1, Number.NaN, 3],
      'not a row',
    ]
    expect(parseCities(rows).map(c => c.id)).toEqual([264371])
  })

  it('rejects a non-array payload', async () => {
    const { parseCities } = await freshModule()
    expect(() => parseCities({})).toThrow(TypeError)
  })
})

describe('loadCities', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('fetches once and shares the result', async () => {
    const { loadCities, CITIES_URL } = await freshModule()
    const fetchMock = vi.fn(async () => jsonResponse([validRow]))
    const [a, b] = await Promise.all([loadCities(fetchMock), loadCities(fetchMock)])
    const c = await loadCities(fetchMock)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(CITIES_URL)
    expect(a).toBe(b)
    expect(c).toBe(a)
  })

  it('can retry after a failed load', async () => {
    const { loadCities } = await freshModule()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({}, 500))
      .mockResolvedValueOnce(jsonResponse([validRow]))
    await expect(loadCities(fetchMock)).rejects.toThrow('HTTP 500')
    await expect(loadCities(fetchMock)).resolves.toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
