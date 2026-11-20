import { useEventListener } from '@vueuse/core'
import { blocksPageScroll } from '@/domain/overscroll'
import type { ScrollState } from '@/domain/overscroll'

/** Elements under the finger that scroll vertically, innermost first. */
function scrollersFrom(target: EventTarget | null): ScrollState[] {
  const result: ScrollState[] = []
  for (let element = target instanceof Element ? target : null; element && element !== document.documentElement; element = element.parentElement) {
    const { overflowY } = getComputedStyle(element)
    if ((overflowY === 'auto' || overflowY === 'scroll') && element.scrollHeight > element.clientHeight) {
      result.push({ scrollTop: element.scrollTop, scrollHeight: element.scrollHeight, clientHeight: element.clientHeight })
    }
  }
  return result
}

/**
 * Keeps the page itself from scrolling, bouncing or pull-to-refreshing on touch screens. The app fills the screen,
 * but a vertical drag on anything that doesn't scroll is handed to the page, and pulling the page down reloads it;
 * iOS Safari doesn't reliably honour `overscroll-behavior` for that. Each one-finger gesture is judged on its first
 * move: a vertical one is cancelled unless an element under the finger can scroll that way. Horizontal gestures
 * (the time slider) and pinches are left alone.
 */
export function usePageScrollGuard(): void {
  let startX = 0
  let startY = 0
  let decision: 'undecided' | 'allow' | 'block' = 'allow'

  useEventListener(document, 'touchstart', (event: TouchEvent) => {
    const touch = event.touches[0]
    if (event.touches.length !== 1 || !touch) {
      decision = 'allow'
      return
    }
    startX = touch.clientX
    startY = touch.clientY
    decision = 'undecided'
  }, { passive: true })

  useEventListener(document, 'touchmove', (event: TouchEvent) => {
    const touch = event.touches[0]
    if (event.touches.length !== 1 || !touch) {
      decision = 'allow'
      return
    }
    if (decision === 'undecided') {
      const dx = touch.clientX - startX
      const dy = touch.clientY - startY
      if (dx === 0 && dy === 0) {
        return
      }
      const horizontal = Math.abs(dx) > Math.abs(dy)
      decision = !horizontal && blocksPageScroll(dy, scrollersFrom(event.target)) ? 'block' : 'allow'
    }
    if (decision === 'block' && event.cancelable) {
      event.preventDefault()
    }
  }, { passive: false })
}
