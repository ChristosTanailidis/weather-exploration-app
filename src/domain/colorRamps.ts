import type { LayerId } from '@/domain/types'

/**
 * Colour ramps per overview layer, from the design handoff. Values are in
 * metric base units (°C, mm per hour, km/h, % cover); unit conversion only
 * changes legend labels, never the ramp.
 */

export interface RampStop {
  value: number
  /** `#rrggbb` */
  color: string
  /** 0–1, defaults to 1. A stop with alpha 0 is drawn as "no colour". */
  alpha?: number
}

export interface ColorRamp {
  layer: LayerId
  stops: readonly RampStop[]
  /** Values labelled on the legend. */
  ticks: readonly number[]
  /** Legend spacing: by value (`true`) or evenly by stop (`false`). */
  linear: boolean
}

export const COLOR_RAMPS: Readonly<Record<LayerId, ColorRamp>> = {
  temperature: {
    layer: 'temperature',
    linear: true,
    ticks: [-30, -15, 0, 15, 30, 45],
    stops: [
      { value: -30, color: '#f1e8ff' },
      { value: -20, color: '#c3a3f2' },
      { value: -10, color: '#7f86e6' },
      { value: -5, color: '#4e8fe6' },
      { value: 0, color: '#3fb8e8' },
      { value: 5, color: '#47cfc0' },
      { value: 10, color: '#7fd68a' },
      { value: 15, color: '#c6dc5b' },
      { value: 20, color: '#f4ce47' },
      { value: 25, color: '#f7a23b' },
      { value: 30, color: '#f06c37' },
      { value: 35, color: '#dc3d46' },
      { value: 40, color: '#b42466' },
      { value: 45, color: '#7c1a6b' },
    ],
  },
  precipitation: {
    layer: 'precipitation',
    linear: false,
    ticks: [0, 1, 2, 5, 10, 20],
    stops: [
      { value: 0, color: '#3b7dd8', alpha: 0 },
      { value: 0.2, color: '#3b7dd8' },
      { value: 1, color: '#3fa4f2' },
      { value: 2, color: '#33c6d0' },
      { value: 5, color: '#62d47a' },
      { value: 10, color: '#f1d04a' },
      { value: 15, color: '#f28a3a' },
      { value: 20, color: '#e0457b' },
    ],
  },
  wind: {
    layer: 'wind',
    linear: true,
    ticks: [0, 20, 40, 60, 80, 100],
    stops: [
      { value: 0, color: '#24365a' },
      { value: 10, color: '#2c5f94' },
      { value: 20, color: '#2b8fa3' },
      { value: 30, color: '#45b38a' },
      { value: 40, color: '#9ccb58' },
      { value: 55, color: '#edc646' },
      { value: 70, color: '#f08a3a' },
      { value: 85, color: '#de4a5a' },
      { value: 100, color: '#b23ba3' },
    ],
  },
  clouds: {
    layer: 'clouds',
    linear: true,
    ticks: [0, 25, 50, 75, 100],
    stops: [
      { value: 0, color: '#8b97ab', alpha: 0 },
      { value: 10, color: '#8b97ab' },
      { value: 40, color: '#a4aebf' },
      { value: 70, color: '#c6cdd8' },
      { value: 100, color: '#f0f3f7' },
    ],
  },
}

type Rgba = readonly [number, number, number, number]

const HEX_COLOR = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i
const PERCENT = 100
const HEX_RADIX = 16
/** How "no colour" stops look on a legend bar. */
const LEGEND_EMPTY = 'rgba(255, 255, 255, 0.06)'

function toRgba(stop: RampStop): Rgba {
  const match = HEX_COLOR.exec(stop.color)
  if (!match) {
    throw new Error(`Invalid ramp colour: ${stop.color}`)
  }
  const [, r = '0', g = '0', b = '0'] = match
  return [parseInt(r, HEX_RADIX), parseInt(g, HEX_RADIX), parseInt(b, HEX_RADIX), stop.alpha ?? 1]
}

function rgbaString([r, g, b, a]: Rgba): string {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${Number(a.toFixed(3))})`
}

/** A stop's colour as a CSS/Mapbox `rgba()` string. */
export const stopColor = (stop: RampStop): string => rgbaString(toRgba(stop))

/**
 * A Mapbox GL `interpolate` expression over `input`
 * (defaults to the feature property `value`).
 */
export function toInterpolateExpression(ramp: ColorRamp, input: unknown = ['get', 'value']): unknown[] {
  return ['interpolate', ['linear'], input, ...ramp.stops.flatMap(stop => [stop.value, stopColor(stop)])]
}

/** Position of a value along the legend, 0–100, following the ramp's spacing. */
export function legendPosition(ramp: ColorRamp, value: number): number {
  const { stops } = ramp
  const first = stops[0]?.value ?? 0
  const last = stops[stops.length - 1]?.value ?? first
  if (ramp.linear) {
    return ((value - first) / (last - first || 1)) * PERCENT
  }
  const upper = stops.findIndex(stop => stop.value >= value)
  if (upper === -1) {
    return PERCENT
  }
  if (upper === 0) {
    return 0
  }
  const lowerStop = stops[upper - 1]
  const upperStop = stops[upper]
  if (!lowerStop || !upperStop) {
    return PERCENT
  }
  const within = (value - lowerStop.value) / (upperStop.value - lowerStop.value || 1)
  return ((upper - 1 + within) / (stops.length - 1)) * PERCENT
}

/** A CSS `linear-gradient` for the legend bar, spaced like the legend ticks. */
export function toCssGradient(ramp: ColorRamp, direction = 'to right'): string {
  const parts = ramp.stops.map((stop) => {
    const color = stop.alpha === 0 ? LEGEND_EMPTY : stopColor(stop)
    return `${color} ${Number(legendPosition(ramp, stop.value).toFixed(2))}%`
  })
  return `linear-gradient(${direction}, ${parts.join(', ')})`
}

export interface LegendTick {
  value: number
  /** Position along the legend, 0–100. */
  positionPct: number
}

/** The ramp's legend ticks with their positions. */
export function legendTicks(ramp: ColorRamp): LegendTick[] {
  return ramp.ticks.map(value => ({ value, positionPct: legendPosition(ramp, value) }))
}

/** The ramp colour for `value`, linearly interpolated and clamped to the ends. */
export function colorAt(ramp: ColorRamp, value: number): string {
  const { stops } = ramp
  const first = stops[0]
  const last = stops[stops.length - 1]
  if (!first || !last) {
    throw new Error(`Empty ramp: ${ramp.layer}`)
  }
  if (value <= first.value) {
    return stopColor(first)
  }
  if (value >= last.value) {
    return stopColor(last)
  }
  const upperIndex = stops.findIndex(stop => stop.value >= value)
  const upper = stops[upperIndex] ?? last
  const lower = stops[upperIndex - 1] ?? first
  const t = (value - lower.value) / (upper.value - lower.value)
  const from = toRgba(lower)
  const to = toRgba(upper)
  const mix = (a: number, b: number): number => a + (b - a) * t
  return rgbaString([mix(from[0], to[0]), mix(from[1], to[1]), mix(from[2], to[2]), mix(from[3], to[3])])
}

/** Colours of what the app draws on the map (labels, pills, markers). */
export const MAP_COLORS = {
  label: '#f4f7fb',
  labelHalo: 'rgba(8, 16, 28, 0.9)',
  labelOnSaved: '#ffffff',
  labelOnSelected: '#0b1220',
  pillSavedFill: 'rgba(8, 14, 26, 0.84)',
  pillSavedStroke: '#f5b94a',
  pillSelectedFill: '#f4f7fb',
  placeholder: 'rgba(169, 180, 198, 0.55)',
  arrow: '#f4f7fb',
  arrowOutline: 'rgba(8, 16, 28, 0.9)',
  pointStroke: '#f4f7fb',
  pointCentre: '#f5b94a',
  graticule: 'rgba(255, 255, 255, 0.04)',
} as const

/** Basemap colours applied over Mapbox's dark style at runtime. */
export const BASEMAP_COLORS = {
  water: '#0c1524',
  land: '#1a2434',
  coastline: '#33415a',
  space: '#060a12',
  atmosphere: '#10203a',
  atmosphereHigh: '#1f4f8f',
  label: '#8a97ac',
  labelHalo: 'rgba(8, 16, 28, 0.9)',
} as const
