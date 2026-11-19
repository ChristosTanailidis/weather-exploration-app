import { beforeEach, describe, expect, it } from 'vitest'
import { createCache } from '@/api/cache'
import type { CacheOptions, StorageLike } from '@/api/cache'
import { MemoryStorage } from '../helpers/memoryStorage'

const MINUTE = 60_000
let time = 0
const now = () => time

function cache(overrides: Partial<CacheOptions> = {}) {
  return createCache({ maxEntries: 3, maxStaleMs: 60 * MINUTE, now, ...overrides })
}

beforeEach(() => {
  time = 1_000_000
})

describe('TTL', () => {
  it('returns fresh entries within the TTL', () => {
    const c = cache()
    c.set('a', 1, 10 * MINUTE)
    time += 10 * MINUTE - 1
    expect(c.get('a')).toMatchObject({ value: 1, fresh: true, storedAt: 1_000_000 })
  })

  it('keeps expired entries as stale data', () => {
    const c = cache()
    c.set('a', 1, 10 * MINUTE)
    time += 10 * MINUTE
    expect(c.get('a')).toMatchObject({ value: 1, fresh: false })
  })

  it('drops entries once they are past the stale window', () => {
    const c = cache()
    c.set('a', 1, 10 * MINUTE)
    time += 70 * MINUTE + 1
    expect(c.get('a')).toBeUndefined()
    expect(c.size).toBe(0)
  })

  it('supports session entries that never expire', () => {
    const c = cache()
    c.set('s', 'x', Number.POSITIVE_INFINITY)
    time += 1e12
    expect(c.get('s')).toMatchObject({ fresh: true })
  })
})

describe('LRU', () => {
  it('evicts the least recently used entry over the cap', () => {
    const c = cache()
    c.set('a', 1, MINUTE)
    c.set('b', 2, MINUTE)
    c.set('c', 3, MINUTE)
    c.get('a')
    c.set('d', 4, MINUTE)
    expect(c.get('b')).toBeUndefined()
    expect(c.get('a')?.value).toBe(1)
    expect(c.size).toBe(3)
  })

  it('treats re-setting a key as a use', () => {
    const c = cache()
    c.set('a', 1, MINUTE)
    c.set('b', 2, MINUTE)
    c.set('c', 3, MINUTE)
    c.set('a', 10, MINUTE)
    c.set('d', 4, MINUTE)
    expect(c.get('a')?.value).toBe(10)
    expect(c.get('b')).toBeUndefined()
  })
})

describe('persistence', () => {
  it('survives a reload', () => {
    const storage = new MemoryStorage()
    cache({ storage }).set('city:1', { t: 5 }, 30 * MINUTE)
    time += MINUTE
    const reloaded = cache({ storage })
    expect(reloaded.get('city:1')).toMatchObject({ value: { t: 5 }, fresh: true, storedAt: 1_000_000 })
  })

  it('keeps session entries out of storage', () => {
    const storage = new MemoryStorage()
    const c = cache({ storage })
    c.set('search:x', [], Number.POSITIVE_INFINITY, { persist: false })
    c.set('kept', 1, MINUTE, { persist: false })
    expect(storage.length).toBe(0)
    expect(cache({ storage }).get('kept')).toBeUndefined()
  })

  it('removes evicted and deleted entries from storage', () => {
    const storage = new MemoryStorage()
    const c = cache({ storage })
    c.set('a', 1, MINUTE)
    c.set('b', 2, MINUTE)
    c.set('c', 3, MINUTE)
    c.set('d', 4, MINUTE)
    c.delete('c')
    expect([...storage.items.keys()].sort()).toEqual(['wx1:b', 'wx1:d'])
  })

  it('loads the newest entries up to the cap', () => {
    const storage = new MemoryStorage()
    const writer = cache({ storage, maxEntries: 10 })
    for (const key of ['a', 'b', 'c', 'd']) {
      writer.set(key, key, MINUTE)
      time += 1
    }
    const reader = cache({ storage })
    expect(reader.size).toBe(3)
    expect(reader.get('a')).toBeUndefined()
    expect(storage.getItem('wx1:a')).toBeNull()
  })

  it('ignores and removes corrupt or long-expired stored entries', () => {
    const storage = new MemoryStorage()
    storage.setItem('wx1:bad-json', '{')
    storage.setItem('wx1:bad-shape', JSON.stringify({ value: 1 }))
    storage.setItem('wx1:ancient', JSON.stringify({ value: 1, storedAt: 0, expiresAt: time - 61 * MINUTE }))
    storage.setItem('other-app', 'untouched')
    const c = cache({ storage })
    expect(c.size).toBe(0)
    expect([...storage.items.keys()]).toEqual(['other-app'])
  })

  it('clear() removes only its own namespace', () => {
    const storage = new MemoryStorage()
    storage.setItem('other-app', 'untouched')
    const c = cache({ storage })
    c.set('a', 1, MINUTE)
    c.clear()
    expect(c.size).toBe(0)
    expect([...storage.items.keys()]).toEqual(['other-app'])
  })
})

describe('quota safety', () => {
  it('evicts older persisted entries to make room', () => {
    const storage = new MemoryStorage(2)
    const c = cache({ storage })
    c.set('a', 1, MINUTE)
    c.set('b', 2, MINUTE)
    c.set('c', 3, MINUTE)
    expect([...storage.items.keys()].sort()).toEqual(['wx1:b', 'wx1:c'])
    expect(c.get('c')?.value).toBe(3)
  })

  it('keeps working in memory when storage always fails', () => {
    const broken: StorageLike = {
      length: 0,
      key: () => null,
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('denied')
      },
      removeItem: () => {
        throw new Error('denied')
      },
    }
    const c = cache({ storage: broken })
    expect(() => c.set('a', 1, MINUTE)).not.toThrow()
    expect(c.get('a')?.value).toBe(1)
    expect(() => c.clear()).not.toThrow()
  })
})
