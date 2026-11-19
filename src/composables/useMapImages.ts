import type mapboxgl from 'mapbox-gl'
import { config } from '@/config'
import { MAP_COLORS } from '@/domain/colorRamps'
import { MAP_IMAGE_PREFIX, PLACEHOLDER_IMAGE, WIND_ARROW_ANGLES, windArrowImage } from '@/domain/mapFeatures'

/*
 * Images the map symbols use: static Meteocons, plus sprites drawn here at
 * pixel ratio 2 (wind arrows, the loading placeholder and the 9-slice
 * pills behind saved and selected labels).
 */

export const PILL_NONE_IMAGE = `${MAP_IMAGE_PREFIX}pill-none`
export const PILL_SAVED_IMAGE = `${MAP_IMAGE_PREFIX}pill-saved`
export const PILL_SELECTED_IMAGE = `${MAP_IMAGE_PREFIX}pill-selected`

const RATIO = config.mapIconPixelRatio
const DEG = Math.PI / 180

const staticIcons = import.meta.glob<string>('@/assets/weather-icons/static/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
})

/** 9-slice metadata, in bitmap pixels. */
interface SpriteOptions {
  stretchX?: [number, number][]
  stretchY?: [number, number][]
  content?: [number, number, number, number]
}

interface Sprite {
  id: string
  /** Size at 1x. */
  width: number
  height: number
  draw: (ctx: CanvasRenderingContext2D) => void
  options?: SpriteOptions
}

/** 9-slice stretch zone, given at 1x, in bitmap pixels. */
const span = (from: number, to: number): [number, number] => [from * RATIO, to * RATIO]
/** 9-slice content box, given at 1x, in bitmap pixels. */
const box = (left: number, top: number, right: number, bottom: number): [number, number, number, number] =>
  [left * RATIO, top * RATIO, right * RATIO, bottom * RATIO]

function pill(width: number, height: number, fill: string, stroke?: string): (ctx: CanvasRenderingContext2D) => void {
  const STROKE_PX = 1.5
  return (ctx) => {
    const inset = stroke ? STROKE_PX / 2 : 0
    ctx.beginPath()
    ctx.roundRect(inset, inset, width - 2 * inset, height - 2 * inset, height / 2 - inset)
    ctx.fillStyle = fill
    ctx.fill()
    if (stroke) {
      ctx.lineWidth = STROKE_PX
      ctx.strokeStyle = stroke
      ctx.stroke()
    }
  }
}

const SAVED = { width: 32, height: 28 }
const SELECTED = { width: 40, height: 35, pointer: 7, pointerHalfWidth: 6 }
const ARROW_PX = 28
const ARROW_PATH = 'M14 3 22 17 15.8 14.8V25H12.2V14.8L6 17Z'

const sprites: Sprite[] = [
  {
    id: PILL_NONE_IMAGE,
    ...SAVED,
    draw: () => undefined,
    options: { stretchX: [span(14, 18)], stretchY: [span(13, 15)], content: box(10, 4, 22, 24) },
  },
  {
    id: PILL_SAVED_IMAGE,
    ...SAVED,
    draw: pill(SAVED.width, SAVED.height, MAP_COLORS.pillSavedFill, MAP_COLORS.pillSavedStroke),
    options: { stretchX: [span(14, 18)], stretchY: [span(13, 15)], content: box(10, 4, 22, 24) },
  },
  {
    id: PILL_SELECTED_IMAGE,
    width: SELECTED.width,
    height: SELECTED.height,
    draw: (ctx) => {
      const body = SELECTED.height - SELECTED.pointer
      pill(SELECTED.width, body, MAP_COLORS.pillSelectedFill)(ctx)
      const mid = SELECTED.width / 2
      ctx.beginPath()
      ctx.moveTo(mid - SELECTED.pointerHalfWidth, body - 1)
      ctx.lineTo(mid + SELECTED.pointerHalfWidth, body - 1)
      ctx.lineTo(mid, SELECTED.height)
      ctx.closePath()
      ctx.fill()
    },
    options: { stretchX: [span(14, 17), span(23, 26)], stretchY: [span(13, 15)], content: box(10, 4, 30, 24) },
  },
  {
    id: PLACEHOLDER_IMAGE,
    width: 44,
    height: 20,
    draw: (ctx) => {
      ctx.fillStyle = MAP_COLORS.placeholder
      ctx.beginPath()
      ctx.arc(10, 10, 8, 0, 2 * Math.PI)
      ctx.fill()
      ctx.beginPath()
      ctx.roundRect(22, 7, 22, 6, 3)
      ctx.fill()
    },
  },
  ...WIND_ARROW_ANGLES.map((angle): Sprite => ({
    id: windArrowImage(angle),
    width: ARROW_PX,
    height: ARROW_PX,
    draw: (ctx) => {
      const half = ARROW_PX / 2
      ctx.translate(half, half)
      ctx.rotate(angle * DEG)
      ctx.translate(-half, -half)
      const path = new Path2D(ARROW_PATH)
      ctx.lineJoin = 'round'
      ctx.lineWidth = 2
      ctx.strokeStyle = MAP_COLORS.arrowOutline
      ctx.stroke(path)
      ctx.fillStyle = MAP_COLORS.arrow
      ctx.fill(path)
    },
  })),
]

function render(sprite: Sprite): ImageData {
  const canvas = document.createElement('canvas')
  canvas.width = sprite.width * RATIO
  canvas.height = sprite.height * RATIO
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas 2D is not available')
  }
  ctx.scale(RATIO, RATIO)
  sprite.draw(ctx)
  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  const image = new Image(config.mapIconPx, config.mapIconPx)
  image.src = url
  await image.decode()
  return image
}

/** Registers weather icons and drawn sprites on the map (once per style). */
export async function loadMapImages(map: mapboxgl.Map): Promise<void> {
  for (const sprite of sprites) {
    if (!map.hasImage(sprite.id)) {
      map.addImage(sprite.id, render(sprite), { pixelRatio: RATIO, ...sprite.options })
    }
  }
  await Promise.all(Object.entries(staticIcons).map(async ([path, url]) => {
    const id = `${MAP_IMAGE_PREFIX}${path.slice(path.lastIndexOf('/') + 1, -'.svg'.length)}`
    if (map.hasImage(id)) {
      return
    }
    const image = await loadImage(url)
    if (!map.hasImage(id)) {
      map.addImage(id, image, { pixelRatio: RATIO })
    }
  }))
}
