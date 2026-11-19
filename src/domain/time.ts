const HOUR_SEC = 3600

/**
 * Indices (hours from `startSec`) at which a new local day begins.
 * `dayOf` returns the local calendar day of an instant; comparing days
 * instead of looking for midnight keeps DST jumps over midnight correct.
 */
export function dayStartIndices(startSec: number, hours: number, dayOf: (sec: number) => number): number[] {
  const indices: number[] = []
  for (let i = 1; i < hours; i++) {
    if (dayOf(startSec + i * HOUR_SEC) !== dayOf(startSec + (i - 1) * HOUR_SEC)) {
      indices.push(i)
    }
  }
  return indices
}
