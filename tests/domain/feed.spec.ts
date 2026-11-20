import { describe, expect, it } from 'vitest'
import { feedStatus } from '@/domain/feed'
import type { FeedReport } from '@/domain/feed'

const ok: FeedReport = { loading: false, failed: false, rateLimited: false, staleSince: null, hasData: true }

describe('feedStatus', () => {
  it('is quiet when everything is fresh', () => {
    expect(feedStatus([ok, ok])).toEqual({ kind: 'none' })
    expect(feedStatus([])).toEqual({ kind: 'none' })
  })

  it('reports the first load only until some data arrived', () => {
    expect(feedStatus([{ ...ok, loading: true, hasData: false }, { ...ok, hasData: false }])).toEqual({ kind: 'firstLoad' })
    expect(feedStatus([{ ...ok, loading: true, hasData: false }, ok])).toEqual({ kind: 'none' })
  })

  it('reports stale data with the oldest age', () => {
    expect(feedStatus([{ ...ok, staleSince: 2_000 }, { ...ok, staleSince: 1_000 }])).toEqual({ kind: 'stale', since: 1_000 })
  })

  it('puts failures first and says whether it was the rate limit', () => {
    expect(feedStatus([{ ...ok, staleSince: 1_000 }, { ...ok, failed: true, rateLimited: true }]))
      .toEqual({ kind: 'failed', rateLimited: true, dataSince: 1_000 })
    expect(feedStatus([{ ...ok, failed: true }])).toEqual({ kind: 'failed', rateLimited: false, dataSince: null })
  })
})
