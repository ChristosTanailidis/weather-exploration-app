import type mapboxgl from 'mapbox-gl'
import arrowUrl from '@/assets/weather-icons/arrow.svg?url'
import { config } from '@/config'
import { MAP_IMAGE_PREFIX, WIND_ARROW_IMAGE } from '@/domain/mapFeatures'

const staticIcons = import.meta.glob<string>('@/assets/weather-icons/static/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
})

const images: [id: string, url: string][] = [
  ...Object.entries(staticIcons).map(([path, url]): [string, string] => [
    `${MAP_IMAGE_PREFIX}${path.slice(path.lastIndexOf('/') + 1, -'.svg'.length)}`,
    url,
  ]),
  [WIND_ARROW_IMAGE, arrowUrl],
]

async function loadImage(url: string): Promise<HTMLImageElement> {
  const image = new Image(config.mapIconPx, config.mapIconPx)
  image.src = url
  await image.decode()
  return image
}

/** Registers the static weather icons and the wind arrow on the map (once per style). */
export async function loadMapImages(map: mapboxgl.Map): Promise<void> {
  await Promise.all(images.map(async ([id, url]) => {
    if (map.hasImage(id)) {
      return
    }
    const image = await loadImage(url)
    if (!map.hasImage(id)) {
      map.addImage(id, image, { pixelRatio: config.mapIconPixelRatio })
    }
  }))
}
