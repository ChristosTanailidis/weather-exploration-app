import { describe, expect, it } from 'vitest'
import { dayStartIndices } from '@/domain/time'

const HOUR = 3600
const utcDay = (sec: number) => new Date(sec * 1000).getUTCDate()
const MIDNIGHT = Date.UTC(2026, 10, 20) / 1000

describe('dayStartIndices', () => {
  it('finds day starts inside a 48 h window', () => {
    expect(dayStartIndices(MIDNIGHT - 5 * HOUR, 48, utcDay)).toEqual([5, 29])
  })

  it('does not count the starting hour itself', () => {
    expect(dayStartIndices(MIDNIGHT, 48, utcDay)).toEqual([24])
  })

  it('still finds the day when DST skips midnight', () => {
    // Local clock jumps from 23:00 to 01:00: the 00:00 hour never exists.
    const dayOf = (sec: number) => utcDay(sec === MIDNIGHT ? MIDNIGHT + HOUR : sec)
    expect(dayStartIndices(MIDNIGHT - 2 * HOUR, 30, dayOf)).toEqual([2, 26])
  })
})
