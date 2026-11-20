import { useIntervalFn } from '@vueuse/core'
import { computed, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFormat } from '@/composables/useFormat'
import { config } from '@/config'
import { feedStatus } from '@/domain/feed'
import { useFeedStore } from '@/stores/feedStore'
import { useStatusStore } from '@/stores/statusStore'

const STATUS_ID = 'feed'
const MS_PER_SEC = 1000
const MS_PER_MIN = 60_000

/**
 * Shows the overview feeds' state in the status slot: first load, stale
 * data with Refresh, or a failure (e.g. HTTP 429 after the service's own
 * retries) with the age of the data on screen, an automatic retry after
 * `feedRetryMs` and "Retry now". Call once, from a long-lived component.
 */
export function useFeedStatus(): void {
  const { t } = useI18n()
  const feed = useFeedStore()
  const status = useStatusStore()
  const { local } = useFormat()
  const nowMs = shallowRef(Date.now())
  const retryAt = shallowRef<number | null>(null)

  const current = computed(() => feedStatus(Object.values(feed.reports)))
  const secondsLeft = computed(() => (retryAt.value === null ? 0 : Math.max(0, Math.ceil((retryAt.value - nowMs.value) / MS_PER_SEC))))

  async function retry(): Promise<void> {
    retryAt.value = null
    await feed.refreshAll()
  }

  const countdown = useIntervalFn(() => {
    nowMs.value = Date.now()
    if (retryAt.value !== null && nowMs.value >= retryAt.value) {
      void retry()
    }
  }, config.countdownTickMs, { immediate: false })

  watch(() => current.value.kind, (kind) => {
    if (kind === 'failed') {
      nowMs.value = Date.now()
      retryAt.value = nowMs.value + config.feedRetryMs
      countdown.resume()
    }
    else {
      retryAt.value = null
      countdown.pause()
    }
  })

  /** Wall-clock time of the viewer, for "Showing weather from 14:02". */
  const viewerTime = (ms: number): string => local.clock(new Date(ms - new Date(ms).getTimezoneOffset() * MS_PER_MIN))

  watch([current, secondsLeft], ([state, seconds]) => {
    switch (state.kind) {
      case 'failed':
        status.show({
          id: STATUS_ID,
          kind: 'warning',
          icon: 'offline',
          title: t('feed.busyTitle'),
          body: [
            t(state.rateLimited ? 'feed.busyRateLimited' : 'feed.busyError'),
            state.dataSince === null ? '' : t('feed.showingFrom', { time: viewerTime(state.dataSince) }),
          ].filter(Boolean).join(' '),
          detail: retryAt.value === null ? undefined : t('feed.retryIn', { seconds }),
          action: { label: t('feed.retryNow'), icon: 'refresh', run: () => void retry() },
        })
        break
      case 'stale':
        status.show({
          id: STATUS_ID,
          kind: 'info',
          icon: 'clock',
          title: t('feed.staleTitle', { minutes: Math.max(1, Math.round((Date.now() - state.since) / MS_PER_MIN)) }),
          body: t('feed.staleBody'),
          action: { label: t('feed.refresh'), icon: 'refresh', run: () => void retry() },
        })
        break
      case 'firstLoad':
        status.show({ id: STATUS_ID, kind: 'info', icon: 'refresh', title: t('feed.loading') })
        break
      case 'none':
        status.clear(STATUS_ID)
        break
    }
  })
}
