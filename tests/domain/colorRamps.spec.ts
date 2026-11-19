import { describe, expect, it } from 'vitest'
import { COLOR_RAMPS, colorAt, legendPosition, legendTicks, stopColor, toCssGradient, toInterpolateExpression } from '@/domain/colorRamps'
import type { ColorRamp } from '@/domain/colorRamps'
import { LAYER_IDS } from '@/domain/types'

const sample: ColorRamp = {
  layer: 'temperature',
  linear: true,
  ticks: [0, 10, 20],
  stops: [
    { value: 0, color: '#000000' },
    { value: 10, color: '#ffffff', alpha: 0.5 },
    { value: 20, color: '#ff0000' },
  ],
}

describe('COLOR_RAMPS', () => {
  it.each(LAYER_IDS)('%s has strictly ascending stops with valid colours', (layer) => {
    const ramp = COLOR_RAMPS[layer]
    expect(ramp.layer).toBe(layer)
    expect(ramp.stops.length).toBeGreaterThanOrEqual(2)
    ramp.stops.forEach((stop, i) => {
      expect(stop.color).toMatch(/^#[0-9a-f]{6}$/i)
      const previous = ramp.stops[i - 1]
      if (previous) {
        expect(stop.value).toBeGreaterThan(previous.value)
      }
    })
  })
})

describe('stopColor', () => {
  it('renders rgba with default alpha 1', () => {
    expect(stopColor({ value: 0, color: '#ff8000' })).toBe('rgba(255, 128, 0, 1)')
    expect(stopColor({ value: 0, color: '#000000', alpha: 0 })).toBe('rgba(0, 0, 0, 0)')
  })

  it('rejects malformed colours', () => {
    expect(() => stopColor({ value: 0, color: 'red' })).toThrow()
  })
})

describe('toInterpolateExpression', () => {
  it('builds a linear Mapbox interpolate expression on the value property', () => {
    expect(toInterpolateExpression(sample)).toEqual([
      'interpolate', ['linear'], ['get', 'value'],
      0, 'rgba(0, 0, 0, 1)',
      10, 'rgba(255, 255, 255, 0.5)',
      20, 'rgba(255, 0, 0, 1)',
    ])
  })

  it('accepts a custom input expression', () => {
    expect(toInterpolateExpression(sample, ['get', 'temp'])[2]).toEqual(['get', 'temp'])
  })
})

describe('toCssGradient', () => {
  it('places stops proportionally between 0% and 100%', () => {
    expect(toCssGradient(sample)).toBe(
      'linear-gradient(to right, rgba(0, 0, 0, 1) 0%, rgba(255, 255, 255, 0.5) 50%, rgba(255, 0, 0, 1) 100%)',
    )
  })

  it('spaces a non-linear ramp evenly and shows empty stops faintly', () => {
    const gradient = toCssGradient(COLOR_RAMPS.precipitation, 'to top')
    expect(gradient.startsWith('linear-gradient(to top, rgba(255, 255, 255, 0.06) 0%, ')).toBe(true)
    expect(gradient).toContain(' 14.29%')
    expect(gradient.endsWith(' 100%)')).toBe(true)
  })
})

describe('colorAt', () => {
  it('clamps below and above the ramp', () => {
    expect(colorAt(sample, -50)).toBe('rgba(0, 0, 0, 1)')
    expect(colorAt(sample, 99)).toBe('rgba(255, 0, 0, 1)')
  })

  it('returns exact stop colours on stops', () => {
    expect(colorAt(sample, 10)).toBe('rgba(255, 255, 255, 0.5)')
  })

  it('interpolates between neighbouring stops', () => {
    expect(colorAt(sample, 5)).toBe('rgba(128, 128, 128, 0.75)')
    expect(colorAt(sample, 15)).toBe('rgba(255, 128, 128, 0.75)')
  })
})

describe('legendTicks', () => {
  it('places linear ramp ticks by value', () => {
    expect(legendTicks(sample)).toEqual([
      { value: 0, positionPct: 0 },
      { value: 10, positionPct: 50 },
      { value: 20, positionPct: 100 },
    ])
    expect(legendTicks(COLOR_RAMPS.temperature).map(t => t.positionPct)).toEqual([0, 20, 40, 60, 80, 100])
  })

  it('spaces non-linear ramp ticks evenly by stop', () => {
    const stops = COLOR_RAMPS.precipitation.stops.length - 1
    expect(legendTicks(COLOR_RAMPS.precipitation)).toEqual([
      { value: 0, positionPct: 0 },
      { value: 1, positionPct: (2 / stops) * 100 },
      { value: 2, positionPct: (3 / stops) * 100 },
      { value: 5, positionPct: (4 / stops) * 100 },
      { value: 10, positionPct: (5 / stops) * 100 },
      { value: 20, positionPct: 100 },
    ])
  })

  it.each(LAYER_IDS)('%s ticks lie within the ramp', (layer) => {
    const ramp = COLOR_RAMPS[layer]
    const first = ramp.stops[0]?.value ?? 0
    const last = ramp.stops[ramp.stops.length - 1]?.value ?? 0
    ramp.ticks.forEach((tick) => {
      expect(tick).toBeGreaterThanOrEqual(first)
      expect(tick).toBeLessThanOrEqual(last)
    })
  })
})

describe('legendPosition', () => {
  it('interpolates between stops on a non-linear ramp', () => {
    const stops = COLOR_RAMPS.precipitation.stops.length - 1
    expect(legendPosition(COLOR_RAMPS.precipitation, 7.5)).toBeCloseTo((4.5 / stops) * 100, 6)
    expect(legendPosition(COLOR_RAMPS.precipitation, -1)).toBe(0)
    expect(legendPosition(COLOR_RAMPS.precipitation, 99)).toBe(100)
  })
})
