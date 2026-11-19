import { config } from '@/config'
import { normalizeLon, pointKey } from '@/domain/geo'
import { LAYER_IDS } from '@/domain/types'
import type { LayerId } from '@/domain/types'
import { roundTo } from '@/domain/units'

/** The map camera: centre and zoom. */
export interface MapView {
  lat: number
  lon: number
  zoom: number
}

/**
 * State shared through the URL query:
 * `v=<lat>,<lon>,<zoom>`, `place=<key>`, `layer=<id>`, `t=<hours from now>`.
 */
export interface UrlState {
  view?: MapView
  place?: string
  layer?: LayerId
  t?: number
}

/** Query keys owned by the URL state; any other key is left alone. */
export const URL_STATE_KEYS = ['v', 'place', 'layer', 't'] as const

export type QueryValue = string | null | readonly (string | null)[] | undefined
export type Query = Readonly<Record<string, QueryValue>>

const VIEW_COORD_DECIMALS = 3
const ZOOM_DECIMALS = 2
const MAX_LAT = 90
const NUMBER = /^-?\d+(\.\d+)?$/
const CITY_KEY = /^city:\d+$/
const POINT_KEY = /^pt:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/
const TIME_INDEX = /^\d+$/

function first(value: QueryValue): string | undefined {
  if (Array.isArray(value)) {
    return value.find((item): item is string => typeof item === 'string')
  }
  return typeof value === 'string' ? value : undefined
}

function toNumber(raw: string | undefined): number | undefined {
  return raw !== undefined && NUMBER.test(raw.trim()) ? Number(raw) : undefined
}

/** `lat,lon,zoom` → view, or `undefined` when malformed or out of range. */
export function parseView(raw: string | undefined): MapView | undefined {
  const parts = raw?.split(',') ?? []
  if (parts.length !== 3) {
    return undefined
  }
  const [lat, lon, zoom] = parts.map(toNumber)
  if (lat === undefined || lon === undefined || zoom === undefined) {
    return undefined
  }
  if (Math.abs(lat) > MAX_LAT || zoom < 0 || zoom > config.maxZoom) {
    return undefined
  }
  return { lat, lon: normalizeLon(lon), zoom }
}

/** A place key in canonical form, or `undefined` when invalid. */
export function parsePlaceKey(raw: string | undefined): string | undefined {
  if (!raw) {
    return undefined
  }
  if (CITY_KEY.test(raw)) {
    return raw
  }
  const match = POINT_KEY.exec(raw)
  if (!match) {
    return undefined
  }
  const lat = Number(match[1])
  const lon = Number(match[2])
  if (Math.abs(lat) > MAX_LAT) {
    return undefined
  }
  return pointKey({ lat, lon }, config.coordPrecision)
}

function parseLayer(raw: string | undefined): LayerId | undefined {
  return LAYER_IDS.find(layer => layer === raw)
}

function parseTimeIndex(raw: string | undefined, hours: number): number | undefined {
  if (raw === undefined || !TIME_INDEX.test(raw)) {
    return undefined
  }
  const index = Number(raw)
  return index < hours ? index : undefined
}

/** Reads the URL state from a query. Invalid values are dropped, never thrown. */
export function parseUrlState(query: Query, hours: number = config.forecastHours): UrlState {
  const state: UrlState = {}
  const view = parseView(first(query.v))
  const place = parsePlaceKey(first(query.place))
  const layer = parseLayer(first(query.layer))
  const t = parseTimeIndex(first(query.t), hours)
  if (view) state.view = view
  if (place) state.place = place
  if (layer) state.layer = layer
  if (t !== undefined) state.t = t
  return state
}

/** Writes the URL state as query values; absent fields produce no key. */
export function serializeUrlState(state: UrlState): Record<string, string> {
  const query: Record<string, string> = {}
  if (state.view) {
    const { lat, lon, zoom } = state.view
    query.v = [
      roundTo(lat, VIEW_COORD_DECIMALS),
      roundTo(normalizeLon(lon), VIEW_COORD_DECIMALS),
      roundTo(zoom, ZOOM_DECIMALS),
    ].join(',')
  }
  if (state.place) query.place = state.place
  if (state.layer) query.layer = state.layer
  if (state.t !== undefined) query.t = String(state.t)
  return query
}
