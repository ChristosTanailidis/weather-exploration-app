/** What one overview feed (cities, grid, collection) last reported. */
export interface FeedReport {
  loading: boolean
  /** The last request failed (after retries). */
  failed: boolean
  /** The failure was HTTP 429. */
  rateLimited: boolean
  /** Oldest `fetchedAt` among stale entries on screen, or `null` when all are fresh. */
  staleSince: number | null
  /** The feed has shown data at least once. */
  hasData: boolean
}

export type FeedStatus =
  | { kind: 'none' }
  | { kind: 'firstLoad' }
  | { kind: 'stale', since: number }
  | { kind: 'failed', rateLimited: boolean, dataSince: number | null }

/**
 * The status-slot message for the overview feeds, most important first:
 * a failure (with the age of what is on screen), stale data, the first
 * load, or nothing.
 */
export function feedStatus(reports: readonly FeedReport[]): FeedStatus {
  const staleTimes = reports.map(r => r.staleSince).filter((t): t is number => t !== null)
  const oldestStale = staleTimes.length > 0 ? Math.min(...staleTimes) : null
  const failed = reports.filter(r => r.failed)
  if (failed.length > 0) {
    return { kind: 'failed', rateLimited: failed.some(r => r.rateLimited), dataSince: oldestStale }
  }
  if (oldestStale !== null) {
    return { kind: 'stale', since: oldestStale }
  }
  if (reports.some(r => r.loading) && !reports.some(r => r.hasData)) {
    return { kind: 'firstLoad' }
  }
  return { kind: 'none' }
}
