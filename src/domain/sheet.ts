/** A resting position of a bottom sheet, as the downward offset of its top edge from fully open. */
export interface SheetStop<T extends string> {
  id: T
  offsetPx: number
}

/** The sheet at the moment the finger lifts. */
export interface SheetRelease {
  /** Downward offset of the sheet's top edge from fully open. */
  offsetPx: number
  /** Release speed, positive downwards. */
  velocityPxPerMs: number
}

export interface SheetPhysics {
  /** How far ahead the release speed carries the sheet before picking the nearest stop. */
  projectionMs: number
  /** From this speed on, a release always moves at least one stop in its direction. */
  flickPxPerMs: number
}

/**
 * Picks the stop a released sheet settles on: the one nearest to where the release speed would carry it,
 * and at least the next stop in the flick direction for a fast release.
 */
export function settleSheet<T extends string>(
  stops: readonly SheetStop<T>[],
  from: T,
  release: SheetRelease,
  physics: SheetPhysics,
): T {
  const sorted = [...stops].sort((a, b) => a.offsetPx - b.offsetPx)
  const start = sorted.find(stop => stop.id === from)
  if (!start) {
    return from
  }
  const projected = release.offsetPx + release.velocityPxPerMs * physics.projectionMs
  let target = start
  for (const stop of sorted) {
    if (Math.abs(stop.offsetPx - projected) < Math.abs(target.offsetPx - projected)) {
      target = stop
    }
  }
  const direction = Math.sign(release.velocityPxPerMs)
  if (Math.abs(release.velocityPxPerMs) >= physics.flickPxPerMs && (target.offsetPx - start.offsetPx) * direction <= 0) {
    const next = direction > 0
      ? sorted.find(stop => stop.offsetPx > start.offsetPx)
      : sorted.findLast(stop => stop.offsetPx < start.offsetPx)
    target = next ?? target
  }
  return target.id
}
