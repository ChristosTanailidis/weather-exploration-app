import type { LayerId } from '@/domain/types'

/**
 * Colour ramps per overview layer. Values are in metric base units
 * (°C, mm per hour, km/h, % cover); unit conversion only changes legend
 * labels, never the ramp. Colours are neutral placeholders until the design
 * pass replaces them.
 */

export interface RampStop {
  value: number
  /** `#rrggbb` */
  color: string
  /** 0–1, defaults to 1. */
  alpha?: number
}

export interface ColorRamp {
  layer: LayerId
  stops: readonly RampStop[]
}

export const COLOR_RAMPS: Readonly<Record<LayerId, ColorRamp>> = {
  temperature: {
    layer: 'temperature',
    stops: [
      { value: -30, color: '#313695' },
      { value: -20, color: '#4575b4' },
      { value: -10, color: '#74add1' },
      { value: 0, color: '#abd9e9' },
      { value: 10, color: '#e0f3f8' },
      { value: 15, color: '#fee090' },
      { value: 20, color: '#fdae61' },
      { value: 30, color: '#f46d43' },
      { value: 40, color: '#d73027' },
    ],
  },
  precipitation: {
    layer: 'precipitation',
    stops: [
      { value: 0, color: '#c6dbef', alpha: 0 },
      { value: 0.1, color: '#c6dbef' },
      { value: 1, color: '#6baed6' },
      { value: 2.5, color: '#3182bd' },
      { value: 5, color: '#08519c' },
      { value: 10, color: '#54278f' },
      { value: 20, color: '#3f007d' },
    ],
  },
  wind: {
    layer: 'wind',
    stops: [
      { value: 0, color: '#f7fcf5' },
      { value: 10, color: '#c7e9c0' },
      { value: 20, color: '#74c476' },
      { value: 40, color: '#fdae61' },
      { value: 60, color: '#f46d43' },
      { value: 90, color: '#d73027' },
      { value: 120, color: '#a50026' },
    ],
  },
  clouds: {
    layer: 'clouds',
    stops: [
      { value: 0, color: '#f0f0f0', alpha: 0 },
      { value: 25, color: '#d9d9d9' },
      { value: 50, color: '#bdbdbd' },
      { value: 75, color: '#969696' },
      { value: 100, color: '#737373' },
    ],
  },
}

type Rgba = readonly [number, number, number, number]

const HEX_COLOR = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i
const PERCENT = 100
const HEX_RADIX = 16

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

/** A CSS `linear-gradient` with stops placed proportionally to their values. */
export function toCssGradient(ramp: ColorRamp, direction = 'to right'): string {
  const first = ramp.stops[0]?.value ?? 0
  const last = ramp.stops[ramp.stops.length - 1]?.value ?? first
  const span = last - first || 1
  const parts = ramp.stops.map((stop) => {
    const position = Number((((stop.value - first) / span) * PERCENT).toFixed(2))
    return `${stopColor(stop)} ${position}%`
  })
  return `linear-gradient(${direction}, ${parts.join(', ')})`
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

export interface LegendTick {
  value: number
  /** Position along the legend, 0–100. */
  positionPct: number
}

/**
 * Stops to label on a legend, keeping labels at least `minGapPct` apart.
 * The first and last stops are always kept.
 */
export function legendTicks(ramp: ColorRamp, minGapPct: number): LegendTick[] {
  const first = ramp.stops[0]?.value ?? 0
  const last = ramp.stops[ramp.stops.length - 1]?.value ?? first
  const span = last - first || 1
  const all = ramp.stops.map(stop => ({ value: stop.value, positionPct: ((stop.value - first) / span) * PERCENT }))
  const ticks: LegendTick[] = []
  for (const tick of all) {
    const previous = ticks[ticks.length - 1]
    const isLast = tick === all[all.length - 1]
    if (!previous || tick.positionPct - previous.positionPct >= minGapPct) {
      ticks.push(tick)
    }
    else if (isLast && ticks.length > 1) {
      ticks[ticks.length - 1] = tick
    }
  }
  return ticks
}

/** Colours of map symbols drawn on top of the basemap. Placeholders until the design pass. */
export const MAP_COLORS = {
  label: '#1f2937',
  labelHalo: '#ffffff',
} as const
