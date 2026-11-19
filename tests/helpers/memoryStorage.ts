import type { StorageLike } from '@/api/cache'

/** In-memory Web Storage stand-in, optionally with a quota in entries. */
export class MemoryStorage implements StorageLike {
  readonly items = new Map<string, string>()
  maxItems: number

  constructor(maxItems = Number.POSITIVE_INFINITY) {
    this.maxItems = maxItems
  }

  get length(): number {
    return this.items.size
  }

  key(index: number): string | null {
    return [...this.items.keys()][index] ?? null
  }

  getItem(key: string): string | null {
    return this.items.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    if (!this.items.has(key) && this.items.size >= this.maxItems) {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    }
    this.items.set(key, value)
  }

  removeItem(key: string): void {
    this.items.delete(key)
  }
}
