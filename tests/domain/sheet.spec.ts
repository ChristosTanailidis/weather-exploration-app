import { describe, expect, it } from 'vitest'
import { settleSheet } from '@/domain/sheet'
import type { SheetStop } from '@/domain/sheet'

type Stop = 'expanded' | 'peek' | 'dismiss'

const stops: SheetStop<Stop>[] = [
  { id: 'expanded', offsetPx: 0 },
  { id: 'peek', offsetPx: 520 },
  { id: 'dismiss', offsetPx: 796 },
]
const physics = { projectionMs: 150, flickPxPerMs: 0.5 }

describe('settleSheet', () => {
  it('snaps back after a short, slow drag', () => {
    expect(settleSheet(stops, 'peek', { offsetPx: 470, velocityPxPerMs: -0.1 }, physics)).toBe('peek')
    expect(settleSheet(stops, 'expanded', { offsetPx: 60, velocityPxPerMs: 0.1 }, physics)).toBe('expanded')
  })

  it('settles on the stop nearest to where the sheet was dragged', () => {
    expect(settleSheet(stops, 'peek', { offsetPx: 200, velocityPxPerMs: 0 }, physics)).toBe('expanded')
    expect(settleSheet(stops, 'peek', { offsetPx: 700, velocityPxPerMs: 0 }, physics)).toBe('dismiss')
    expect(settleSheet(stops, 'expanded', { offsetPx: 400, velocityPxPerMs: 0 }, physics)).toBe('peek')
  })

  it('carries the sheet with its release speed', () => {
    expect(settleSheet(stops, 'peek', { offsetPx: 560, velocityPxPerMs: 0.45 }, physics)).toBe('peek')
    expect(settleSheet(stops, 'peek', { offsetPx: 620, velocityPxPerMs: 0.45 }, physics)).toBe('dismiss')
  })

  it('moves at least one stop on a flick', () => {
    expect(settleSheet(stops, 'peek', { offsetPx: 500, velocityPxPerMs: -0.8 }, physics)).toBe('expanded')
    expect(settleSheet(stops, 'peek', { offsetPx: 540, velocityPxPerMs: 0.8 }, physics)).toBe('dismiss')
    expect(settleSheet(stops, 'expanded', { offsetPx: 20, velocityPxPerMs: 0.8 }, physics)).toBe('peek')
  })

  it('follows a long fast drag past the next stop', () => {
    expect(settleSheet(stops, 'expanded', { offsetPx: 600, velocityPxPerMs: 2 }, physics)).toBe('dismiss')
  })

  it('stays put when flicked past the last stop', () => {
    expect(settleSheet(stops, 'expanded', { offsetPx: 0, velocityPxPerMs: -2 }, physics)).toBe('expanded')
  })

  it('follows the flick, not the drag, when they disagree', () => {
    expect(settleSheet(stops, 'peek', { offsetPx: 560, velocityPxPerMs: -0.8 }, physics)).toBe('expanded')
  })

  it('works with two stops, as for a sheet that only opens and closes', () => {
    const open: SheetStop<'open' | 'dismiss'>[] = [{ id: 'open', offsetPx: 0 }, { id: 'dismiss', offsetPx: 796 }]
    expect(settleSheet(open, 'open', { offsetPx: 120, velocityPxPerMs: 0.2 }, physics)).toBe('open')
    expect(settleSheet(open, 'open', { offsetPx: 120, velocityPxPerMs: 1 }, physics)).toBe('dismiss')
    expect(settleSheet(open, 'open', { offsetPx: 450, velocityPxPerMs: 0 }, physics)).toBe('dismiss')
  })

  it('accepts stops in any order and ignores an unknown start', () => {
    const shuffled = [stops[2]!, stops[0]!, stops[1]!]
    expect(settleSheet(shuffled, 'peek', { offsetPx: 500, velocityPxPerMs: -0.8 }, physics)).toBe('expanded')
    expect(settleSheet(stops.slice(0, 2), 'dismiss', { offsetPx: 0, velocityPxPerMs: 0 }, physics)).toBe('dismiss')
  })
})
