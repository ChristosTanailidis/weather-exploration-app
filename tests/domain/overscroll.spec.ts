import { describe, expect, it } from 'vitest'
import { blocksPageScroll } from '@/domain/overscroll'

const list = (scrollTop: number) => ({ scrollTop, scrollHeight: 1000, clientHeight: 400 })

describe('blocksPageScroll', () => {
  it('blocks a vertical drag with nothing scrollable under the finger', () => {
    expect(blocksPageScroll(40, [])).toBe(true)
    expect(blocksPageScroll(-40, [])).toBe(true)
  })

  it('blocks pulling down on a list that is already at its top (pull-to-refresh)', () => {
    expect(blocksPageScroll(40, [list(0)])).toBe(true)
  })

  it('lets a scrolled list scroll back up', () => {
    expect(blocksPageScroll(40, [list(120)])).toBe(false)
  })

  it('lets a list scroll down until its end, then blocks', () => {
    expect(blocksPageScroll(-40, [list(0)])).toBe(false)
    expect(blocksPageScroll(-40, [list(600)])).toBe(true)
    expect(blocksPageScroll(-40, [list(599.5)])).toBe(true)
  })

  it('allows the drag when any scroller under the finger can take it', () => {
    expect(blocksPageScroll(40, [list(0), list(80)])).toBe(false)
    expect(blocksPageScroll(40, [list(0), list(0)])).toBe(true)
  })

  it('does nothing without vertical movement', () => {
    expect(blocksPageScroll(0, [])).toBe(false)
  })
})
