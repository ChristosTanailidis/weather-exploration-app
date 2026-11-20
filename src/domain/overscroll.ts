/** Scroll position of an element under the finger. */
export interface ScrollState {
  scrollTop: number
  scrollHeight: number
  clientHeight: number
}

/** Sub-pixel rounding at the bottom of a scroller. */
const EDGE_TOLERANCE_PX = 1

/**
 * Whether a vertical drag must be cancelled so that it doesn't scroll, bounce or pull-to-refresh the page:
 * true unless one of the scrollers under the finger can still scroll in the drag direction.
 * `dyPx` is the finger movement, positive downwards (which scrolls content back towards its top).
 */
export function blocksPageScroll(dyPx: number, scrollers: readonly ScrollState[]): boolean {
  if (dyPx === 0) {
    return false
  }
  const canScroll = (s: ScrollState): boolean =>
    dyPx > 0 ? s.scrollTop > 0 : s.scrollTop + s.clientHeight < s.scrollHeight - EDGE_TOLERANCE_PX
  return !scrollers.some(canScroll)
}
