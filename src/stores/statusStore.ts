import { defineStore } from 'pinia'
import { shallowRef } from 'vue'
import type { IconName } from '@/components/ui/iconPaths'
import { config } from '@/config'

export type StatusKind = 'info' | 'success' | 'warning' | 'danger'

export interface StatusAction {
  label: string
  icon?: IconName
  run: () => void
}

/** One message in the status slot. Texts are already translated. */
export interface StatusMessage {
  /** Identifies the message's source, so it can replace or clear itself. */
  id: string
  kind: StatusKind
  icon: IconName
  title: string
  body?: string
  action?: StatusAction
  dismissible?: boolean
}

/** The fixed status slot: one message at a time, newest wins. Success hides by itself. */
export const useStatusStore = defineStore('status', () => {
  const message = shallowRef<StatusMessage | null>(null)
  let hideTimer: ReturnType<typeof setTimeout> | undefined

  function show(next: StatusMessage): void {
    clearTimeout(hideTimer)
    message.value = next
    if (next.kind === 'success') {
      hideTimer = setTimeout(() => clear(next.id), config.statusAutoHideMs)
    }
  }

  /** Removes the current message if it is `id` (or any message without an id). */
  function clear(id?: string): void {
    if (!id || message.value?.id === id) {
      clearTimeout(hideTimer)
      message.value = null
    }
  }

  return { message, show, clear }
})
