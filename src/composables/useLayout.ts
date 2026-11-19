import { useMediaQuery } from '@vueuse/core'
import { config } from '@/config'

/** `true` on the desktop layout (drawer, full controls); `false` on mobile. */
export function useIsDesktop() {
  return useMediaQuery(config.desktopMediaQuery)
}
