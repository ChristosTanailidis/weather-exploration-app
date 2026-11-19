import type mapboxgl from 'mapbox-gl'
import { BASEMAP_COLORS, MAP_COLORS } from '@/domain/colorRamps'

/*
 * The design's quiet dark basemap, applied on top of Mapbox's dark style at
 * runtime so it works with any access token (a custom Studio style would
 * only load with the owner's token).
 */

const HIDDEN = /road|bridge|tunnel|aeroway|transit|ferry|building|landuse|landcover|national-park|hillshade|land-structure|admin|poi|airport|settlement|state|natural|waterway|golf|pitch|path|contour|water-shadow/
const KEPT_LABELS = new Set(['country-label', 'continent-label', 'water-point-label'])

const COASTLINE_LAYER = 'wx-coastline'
const GRATICULE_SOURCE = 'wx-graticule'
const GRATICULE_LAYER = 'wx-graticule'
const GRATICULE_STEP_DEG = 15
const GRATICULE_SAMPLE_DEG = 5
const GRATICULE_MAX_LAT = 75
const MERCATOR_MAX_LAT = 85
const COASTLINE_WIDTH_PX = 0.8
const LABEL_HALO_PX = 1
const HORIZON_BLEND = 0.06

function range(from: number, to: number, step: number): number[] {
  return Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step)
}

interface LineCollection {
  type: 'FeatureCollection'
  features: { type: 'Feature', properties: Record<string, never>, geometry: { type: 'LineString', coordinates: number[][] } }[]
}

/** Meridians and parallels every 15°, sampled densely enough to curve on the globe. */
function graticule(): LineCollection {
  const meridians = range(-180, 180 - GRATICULE_STEP_DEG, GRATICULE_STEP_DEG).map(lon =>
    range(-MERCATOR_MAX_LAT, MERCATOR_MAX_LAT, GRATICULE_SAMPLE_DEG).map(lat => [lon, lat]))
  const parallels = range(-GRATICULE_MAX_LAT, GRATICULE_MAX_LAT, GRATICULE_STEP_DEG).map(lat =>
    range(-180, 180, GRATICULE_SAMPLE_DEG).map(lon => [lon, lat]))
  return {
    type: 'FeatureCollection',
    features: [...meridians, ...parallels].map(coordinates => ({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates },
    })),
  }
}

/** Recolours and simplifies the loaded style. Safe to call on every `style.load`. */
export function applyBasemapTheme(map: mapboxgl.Map): void {
  const layers = map.getStyle()?.layers ?? []
  const firstSymbolId = layers.find(layer => layer.type === 'symbol')?.id

  for (const layer of layers) {
    const { id } = layer
    if (layer.type === 'symbol') {
      if (KEPT_LABELS.has(id)) {
        map.setPaintProperty(id, 'text-color', BASEMAP_COLORS.label)
        map.setPaintProperty(id, 'text-halo-color', BASEMAP_COLORS.labelHalo)
        map.setPaintProperty(id, 'text-halo-width', LABEL_HALO_PX)
      }
      else {
        map.setLayoutProperty(id, 'visibility', 'none')
      }
    }
    else if (layer.type === 'background') {
      map.setPaintProperty(id, 'background-color', BASEMAP_COLORS.land)
    }
    else if (id === 'water' && layer.type === 'fill') {
      map.setPaintProperty(id, 'fill-color', BASEMAP_COLORS.water)
    }
    else if (HIDDEN.test(id)) {
      map.setLayoutProperty(id, 'visibility', 'none')
    }
  }

  if (map.getSource('composite') && !map.getLayer(COASTLINE_LAYER)) {
    map.addLayer({
      'id': COASTLINE_LAYER,
      'type': 'line',
      'source': 'composite',
      'source-layer': 'water',
      'paint': { 'line-color': BASEMAP_COLORS.coastline, 'line-width': COASTLINE_WIDTH_PX },
    }, firstSymbolId)
  }

  if (!map.getSource(GRATICULE_SOURCE)) {
    map.addSource(GRATICULE_SOURCE, { type: 'geojson', data: graticule() })
    map.addLayer({
      id: GRATICULE_LAYER,
      type: 'line',
      source: GRATICULE_SOURCE,
      paint: { 'line-color': MAP_COLORS.graticule, 'line-width': 1 },
    }, firstSymbolId)
  }

  map.setFog({
    'color': BASEMAP_COLORS.atmosphere,
    'high-color': BASEMAP_COLORS.atmosphereHigh,
    'horizon-blend': HORIZON_BLEND,
    'space-color': BASEMAP_COLORS.space,
    'star-intensity': 0,
  })
}
