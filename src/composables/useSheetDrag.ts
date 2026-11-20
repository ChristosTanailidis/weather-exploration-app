import { ref } from 'vue'
import { config } from '@/config'

export interface SheetDragOptions {
  /** Whether a drag may start on this element (form fields never start one). */
  canStart: (target: Element) => boolean
  /** Lowest offset the sheet may be dragged to, negative meaning above where the drag started. */
  minOffsetPx: () => number
  /** The finger lifted after a drag: distance and release speed, both positive downwards. */
  onRelease: (dyPx: number, velocityPxPerMs: number) => void
}

interface Sample {
  y: number
  t: number
}

/**
 * Vertical drag for a mobile sheet: follows the finger once it moves past a small slop, reports the release
 * speed, and swallows the click that a drag would otherwise trigger on a button under the finger.
 * The element needs `touch-action: none` where drags start, or the browser claims the gesture for scrolling.
 */
export function useSheetDrag(options: SheetDragOptions) {
  const dragPx = ref(0)
  const dragging = ref(false)
  let pointerId: number | null = null
  let startY = 0
  let samples: Sample[] = []
  let suppressClick = false

  /** A new primary press always starts afresh, so a press that ended unseen can't block later drags. */
  function onPointerdown(event: PointerEvent): void {
    const target = event.target instanceof Element ? event.target : null
    if (!event.isPrimary || event.button !== 0 || !target) {
      return
    }
    reset()
    if (target.closest('input, textarea, select') || !options.canStart(target)) {
      return
    }
    pointerId = event.pointerId
    startY = event.clientY
    samples = [{ y: event.clientY, t: event.timeStamp }]
  }

  function onPointermove(event: PointerEvent): void {
    if (event.pointerId !== pointerId) {
      return
    }
    const dy = event.clientY - startY
    if (!dragging.value) {
      if (Math.abs(dy) < config.sheetDragSlopPx) {
        return
      }
      dragging.value = true
      if (event.currentTarget instanceof Element) {
        event.currentTarget.setPointerCapture(event.pointerId)
      }
    }
    dragPx.value = Math.max(options.minOffsetPx(), dy)
    const moves = event.getCoalescedEvents?.() ?? []
    for (const move of moves.length > 0 ? moves : [event]) {
      samples.push({ y: move.clientY, t: move.timeStamp })
    }
  }

  /**
   * Speed of the last moves before the release. When frames are slow and the window holds a single move,
   * the last two moves are used, as long as the finger was still moving within the window.
   */
  function velocityAt(timeMs: number): number {
    const since = timeMs - config.sheetVelocityWindowMs
    const recent = samples.filter(sample => sample.t >= since)
    const pair = recent.length >= 2 ? recent : samples.slice(-2)
    const first = pair[0]
    const last = pair.at(-1)
    if (!first || !last || last.t < since || last.t <= first.t) {
      return 0
    }
    return (last.y - first.y) / (last.t - first.t)
  }

  function reset(): void {
    pointerId = null
    dragging.value = false
    dragPx.value = 0
    samples = []
  }

  function onPointerup(event: PointerEvent): void {
    if (event.pointerId !== pointerId) {
      return
    }
    if (!dragging.value) {
      reset()
      return
    }
    const dy = dragPx.value
    const velocity = velocityAt(event.timeStamp)
    reset()
    suppressClick = true
    setTimeout(() => {
      suppressClick = false
    })
    options.onRelease(dy, velocity)
  }

  /**
   * Cancels touch moves while a drag may be under way. `touch-action: none` alone stops panning, but the browser
   * still reads the swipe as a fling and swallows the next tap to stop it; this also keeps that tap a click.
   */
  function onTouchmove(event: TouchEvent): void {
    if (pointerId !== null && event.cancelable) {
      event.preventDefault()
    }
  }

  function onPointercancel(event: PointerEvent): void {
    if (event.pointerId === pointerId) {
      reset()
    }
  }

  /** Registered in the capture phase so the click never reaches the button the drag started on. */
  function onClickCapture(event: MouseEvent): void {
    if (suppressClick) {
      suppressClick = false
      event.stopPropagation()
      event.preventDefault()
    }
  }

  return {
    dragPx,
    dragging,
    handlers: { onPointerdown, onPointermove, onPointerup, onPointercancel, onTouchmove, onClickCapture },
  }
}
