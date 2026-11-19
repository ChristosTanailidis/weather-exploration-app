/**
 * Key/value cache with per-entry TTL, an LRU cap and optional localStorage
 * persistence. Expired entries stay available as stale data for a while,
 * so the app can fall back to them when the network fails.
 */

/** The subset of the Web Storage API the cache needs. */
export interface StorageLike {
  readonly length: number
  key(index: number): string | null
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface CacheEntry<T> {
  value: T
  storedAt: number
  expiresAt: number
}

export interface CacheHit<T> extends CacheEntry<T> {
  /** `false` once the TTL has passed; the value is then stale but usable as a fallback. */
  fresh: boolean
}

export interface CacheOptions {
  maxEntries: number
  /** How long past expiry an entry is kept as stale data. */
  maxStaleMs: number
  /** Where to persist entries; `null` keeps everything in memory. */
  storage?: StorageLike | null
  /** Prefix of persisted keys. Bump it when the stored format changes. */
  namespace?: string
  now?: () => number
}

export interface SetOptions {
  /** Persist to storage (default) or keep for this session only. */
  persist?: boolean
}

export interface Cache {
  get<T>(key: string): CacheHit<T> | undefined
  set<T>(key: string, value: T, ttlMs: number, options?: SetOptions): void
  delete(key: string): void
  clear(): void
  readonly size: number
}

interface StoredEntry extends CacheEntry<unknown> {
  persisted: boolean
}

const DEFAULT_NAMESPACE = 'wx1:'
const MAX_QUOTA_RETRIES = 5

function isEntry(value: unknown): value is CacheEntry<unknown> {
  return typeof value === 'object'
    && value !== null
    && 'value' in value
    && 'storedAt' in value
    && 'expiresAt' in value
    && Number.isFinite(value.storedAt)
    && Number.isFinite(value.expiresAt)
}

/** `window.localStorage` when it exists and is usable, otherwise `null`. */
export function browserStorage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  }
  catch {
    return null
  }
}

/** Creates a cache. Persisted entries are loaded lazily on first use. */
export function createCache(options: CacheOptions): Cache {
  const { maxEntries, maxStaleMs } = options
  const storage = options.storage ?? null
  const namespace = options.namespace ?? DEFAULT_NAMESPACE
  const now = options.now ?? (() => Date.now())
  const entries = new Map<string, StoredEntry>()
  let hydrated = false

  const isExpiredForGood = (entry: CacheEntry<unknown>): boolean => now() > entry.expiresAt + maxStaleMs

  function storageKeys(): string[] {
    if (!storage) {
      return []
    }
    try {
      const keys: string[] = []
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i)
        if (key?.startsWith(namespace)) {
          keys.push(key)
        }
      }
      return keys
    }
    catch {
      return []
    }
  }

  function removeStored(key: string): void {
    try {
      storage?.removeItem(namespace + key)
    }
    catch {
      // Storage unavailable: nothing to remove.
    }
  }

  function remove(key: string): void {
    const entry = entries.get(key)
    entries.delete(key)
    if (entry?.persisted) {
      removeStored(key)
    }
  }

  function evictOverflow(): void {
    while (entries.size > maxEntries) {
      const oldest = entries.keys().next().value
      if (oldest === undefined) {
        return
      }
      remove(oldest)
    }
  }

  function hydrate(): void {
    if (hydrated) {
      return
    }
    hydrated = true
    const loaded: [string, StoredEntry][] = []
    for (const storageKey of storageKeys()) {
      const key = storageKey.slice(namespace.length)
      let parsed: unknown
      try {
        parsed = JSON.parse(storage?.getItem(storageKey) ?? 'null')
      }
      catch {
        parsed = null
      }
      if (!isEntry(parsed) || isExpiredForGood(parsed)) {
        removeStored(key)
        continue
      }
      loaded.push([key, { ...parsed, persisted: true }])
    }
    loaded.sort(([, a], [, b]) => a.storedAt - b.storedAt)
    for (const [key, entry] of loaded) {
      entries.set(key, entry)
    }
    evictOverflow()
  }

  /** Drops the least recently used persisted entry other than `keep`. */
  function evictOldestPersisted(keep: string): boolean {
    for (const [key, entry] of entries) {
      if (key !== keep && entry.persisted) {
        remove(key)
        return true
      }
    }
    return false
  }

  function persist(key: string, entry: CacheEntry<unknown>): boolean {
    if (!storage) {
      return false
    }
    const json = JSON.stringify(entry)
    for (let attempt = 0; attempt < MAX_QUOTA_RETRIES; attempt++) {
      try {
        storage.setItem(namespace + key, json)
        return true
      }
      catch {
        // Most likely the quota: make room and try again.
        if (!evictOldestPersisted(key)) {
          return false
        }
      }
    }
    return false
  }

  return {
    get<T>(key: string): CacheHit<T> | undefined {
      hydrate()
      const entry = entries.get(key)
      if (!entry) {
        return undefined
      }
      if (isExpiredForGood(entry)) {
        remove(key)
        return undefined
      }
      entries.delete(key)
      entries.set(key, entry)
      return {
        value: entry.value as T,
        storedAt: entry.storedAt,
        expiresAt: entry.expiresAt,
        fresh: now() < entry.expiresAt,
      }
    },

    set<T>(key: string, value: T, ttlMs: number, { persist: shouldPersist = true }: SetOptions = {}): void {
      hydrate()
      const storedAt = now()
      const entry: CacheEntry<T> = { value, storedAt, expiresAt: storedAt + ttlMs }
      remove(key)
      const persisted = shouldPersist && Number.isFinite(entry.expiresAt) && persist(key, entry)
      entries.set(key, { ...entry, persisted })
      evictOverflow()
    },

    delete(key: string): void {
      hydrate()
      remove(key)
    },

    clear(): void {
      hydrate()
      entries.clear()
      for (const storageKey of storageKeys()) {
        removeStored(storageKey.slice(namespace.length))
      }
    },

    get size(): number {
      hydrate()
      return entries.size
    },
  }
}
