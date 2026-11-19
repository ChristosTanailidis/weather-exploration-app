import { describe, expect, it } from 'vitest'
import { i18n } from '@/i18n'

describe('i18n', () => {
  it('resolves English messages', () => {
    expect(i18n.global.t('app.title')).toBe('Weather Explorer')
  })
})
