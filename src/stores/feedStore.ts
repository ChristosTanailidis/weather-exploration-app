import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Cached } from '@/api/weatherService'
import { HttpError } from '@/api/openMeteo'
import type { FeedReport } from '@/domain/feed'

const HTTP_TOO_MANY_REQUESTS = 429

export type FeedSource = 'cities' | 'grid' | 'collection'

/** Builds a feed report from an overview result. */
export function reportFrom(entries: ReadonlyMap<string, Cached<unknown>>, error: unknown, hasData: boolean): Omit<FeedReport, 'loading'> {
  const staleTimes = [...entries.values()].filter(entry => entry.stale).map(entry => entry.fetchedAt)
  return {
    failed: error !== undefined,
    rateLimited: error instanceof HttpError && error.status === HTTP_TOO_MANY_REQUESTS,
    staleSince: staleTimes.length > 0 ? Math.min(...staleTimes) : null,
    hasData,
  }
}

const EMPTY: FeedReport = { loading: false, failed: false, rateLimited: false, staleSince: null, hasData: false }

/** Latest state of each overview feed, and a way to refresh them all (Retry now). */
export const useFeedStore = defineStore('feed', () => {
  const reports = ref<Partial<Record<FeedSource, FeedReport>>>({})
  const refreshers = new Map<FeedSource, () => Promise<void>>()

  function report(source: FeedSource, next: Partial<FeedReport>): void {
    reports.value = { ...reports.value, [source]: { ...(reports.value[source] ?? EMPTY), ...next } }
  }

  function register(source: FeedSource, refresh: () => Promise<void>): void {
    refreshers.set(source, refresh)
  }

  async function refreshAll(): Promise<void> {
    await Promise.all([...refreshers.values()].map(refresh => refresh()))
  }

  return { reports, report, register, refreshAll }
})
