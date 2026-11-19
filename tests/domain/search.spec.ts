import { describe, expect, it } from 'vitest'
import { highlightMatch, placeFromSearchResult } from '@/domain/search'
import type { SearchResult } from '@/domain/types'

describe('highlightMatch', () => {
  it('marks a prefix match', () => {
    expect(highlightMatch('Paris', 'pa')).toEqual([
      { text: 'Pa', match: true },
      { text: 'ris', match: false },
    ])
  })

  it('marks a match in the middle, case-insensitively', () => {
    expect(highlightMatch('Thessaloniki', ' LONI ')).toEqual([
      { text: 'Thessa', match: false },
      { text: 'loni', match: true },
      { text: 'ki', match: false },
    ])
  })

  it('returns the whole name when nothing matches or the query is empty', () => {
    expect(highlightMatch('Athens', 'xyz')).toEqual([{ text: 'Athens', match: false }])
    expect(highlightMatch('Athens', '  ')).toEqual([{ text: 'Athens', match: false }])
  })
})

describe('placeFromSearchResult', () => {
  const result: SearchResult = {
    id: 734077, name: 'Thessaloniki', lat: 40.64072, lon: 22.93493, countryCode: 'GR', country: 'Greece', admin1: 'Central Macedonia',
  }

  it('uses the city key for dataset cities', () => {
    expect(placeFromSearchResult(result, id => id === 734077, 2)).toEqual({
      key: 'city:734077', kind: 'city', name: 'Thessaloniki', lat: 40.64072, lon: 22.93493,
      countryCode: 'GR', admin1: 'Central Macedonia', country: 'Greece',
    })
  })

  it('uses a point key for other places', () => {
    expect(placeFromSearchResult(result, () => false, 2)).toMatchObject({ key: 'pt:40.64,22.93', kind: 'search' })
  })
})
