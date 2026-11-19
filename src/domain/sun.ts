import type { LatLon } from '@/domain/types'

const DEG = Math.PI / 180
const SEC_PER_DAY = 86_400
const UNIX_EPOCH_JULIAN_DAY = 2_440_587.5
const J2000_JULIAN_DAY = 2_451_545
const HOURS_PER_DAY = 24
const DEG_PER_HOUR = 15
const HOUR_SEC = 3600
/** Sun elevation at sunrise/sunset: refraction plus the sun's radius. */
export const HORIZON_ELEVATION_DEG = -0.833

/**
 * Approximate solar elevation in degrees (low-precision almanac formulas,
 * accurate to well under a degree), enough to shade night hours.
 */
export function solarElevationDeg(place: LatLon, timeSec: number): number {
  const d = timeSec / SEC_PER_DAY + UNIX_EPOCH_JULIAN_DAY - J2000_JULIAN_DAY
  const meanAnomaly = (357.529 + 0.98560028 * d) * DEG
  const meanLongitude = 280.459 + 0.98564736 * d
  const eclipticLongitude = (meanLongitude + 1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly)) * DEG
  const obliquity = (23.439 - 0.00000036 * d) * DEG
  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude))
  const rightAscension = Math.atan2(Math.cos(obliquity) * Math.sin(eclipticLongitude), Math.cos(eclipticLongitude))
  const siderealHours = (((18.697374558 + 24.06570982441908 * d) % HOURS_PER_DAY) + HOURS_PER_DAY) % HOURS_PER_DAY
  const hourAngle = (siderealHours * DEG_PER_HOUR + place.lon) * DEG - rightAscension
  const lat = place.lat * DEG
  const sinElevation = Math.sin(lat) * Math.sin(declination) + Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle)
  return Math.asin(Math.max(-1, Math.min(1, sinElevation))) / DEG
}

/** Whether the sun is below the horizon at `place` and `timeSec`. */
export function isNight(place: LatLon, timeSec: number): boolean {
  return solarElevationDeg(place, timeSec) < HORIZON_ELEVATION_DEG
}

export interface IndexRange {
  start: number
  /** Exclusive. */
  end: number
}

/** Runs of hourly slots (from `startSec`) that are night at `place`. */
export function nightRanges(place: LatLon, startSec: number, hours: number): IndexRange[] {
  const ranges: IndexRange[] = []
  let open: number | null = null
  for (let i = 0; i < hours; i++) {
    const night = isNight(place, startSec + i * HOUR_SEC)
    if (night && open === null) {
      open = i
    }
    if (!night && open !== null) {
      ranges.push({ start: open, end: i })
      open = null
    }
  }
  if (open !== null) {
    ranges.push({ start: open, end: hours })
  }
  return ranges
}
