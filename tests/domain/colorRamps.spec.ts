import { describe, expect, it } from 'vitest'
import { COLOR_RAMPS, colorAt, legendTicks, stopColor, toCssGradient, toInterpolateExpression } from '@/domain/colorRamps'
import type { ColorRamp } from '@/domain/colorRamps'
import { LAYER_IDS } from '@/domain/types'

const sample: ColorRamp = {
  layer: 'temperature',
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

  it('handles uneven spacing and custom direction', () => {
    const gradient = toCssGradient(COLOR_RAMPS.precipitation, 'to top')
    expect(gradient.startsWith('linear-gradient(to top, ')).toBe(true)
    expect(gradient).toContain(' 0%')
    expect(gradient).toContain(' 100%')
    expect(gradient).toContain(' 5%')
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
  it('labels every stop when there is room', () => {
    expect(legendTicks(sample, 10)).toEqual([
      { value: 0, positionPct: 0 },
      { value: 10, positionPct: 50 },
      { value: 20, positionPct: 100 },
    ])
  })

  it('drops stops that would overlap and always keeps both ends', () => {
    const ticks = legendTicks(COLOR_RAMPS.precipitation, 12)
    expect(ticks[0]?.value).toBe(0)
    expect(ticks[ticks.length - 1]?.value).toBe(20)
    expect(ticks.map(t => t.value)).not.toContain(0.1)
    ticks.slice(1).forEach((tick, i) => {
      expect(tick.positionPct - (ticks[i]?.positionPct ?? 0)).toBeGreaterThanOrEqual(12)
    })
  })

  it.each(LAYER_IDS)('works for the %s ramp', (layer) => {
    const ticks = legendTicks(COLOR_RAMPS[layer], 12)
    expect(ticks.length).toBeGreaterThanOrEqual(2)
    expect(ticks[ticks.length - 1]?.positionPct).toBe(100)
  })
})
