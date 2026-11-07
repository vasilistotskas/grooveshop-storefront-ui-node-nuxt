import { describe, it, expect, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { setPersonalizationConsent } from '~~/test/helpers/consent'

/**
 * What the browser keeps for personalisation leaves the moment the visitor
 * no longer agrees, whichever design's banner they answered in.
 */
const RECENTLY_VIEWED = 'grooveshop:recently-viewed'

describe('personalization-storage plugin', () => {
  beforeEach(async () => {
    setPersonalizationConsent(true)
    await flushPromises()
    clearNuxtState('recently-viewed:items')
    window.localStorage.clear()
    window.localStorage.setItem(RECENTLY_VIEWED, JSON.stringify([{ id: 1, name: 'P1', addedAt: 0 }]))
    window.localStorage.setItem('search:recent:el', JSON.stringify(['μπότες']))
    window.localStorage.setItem('search:recent:en', JSON.stringify(['boots']))
    window.localStorage.setItem('accessibility', '{}')
  })

  it('keeps them while the visitor agrees', async () => {
    await flushPromises()

    expect(window.localStorage.getItem(RECENTLY_VIEWED)).not.toBeNull()
    expect(window.localStorage.getItem('search:recent:el')).not.toBeNull()
  })

  it('removes both histories, in every language, on a withdrawal, and nothing else', async () => {
    const { items } = useRecentlyViewed()
    expect(items.value).toHaveLength(1)

    setPersonalizationConsent(false)
    await flushPromises()

    expect(window.localStorage.getItem(RECENTLY_VIEWED)).toBeNull()
    expect(window.localStorage.getItem('search:recent:el')).toBeNull()
    expect(window.localStorage.getItem('search:recent:en')).toBeNull()
    expect(window.localStorage.getItem('accessibility')).toBe('{}')
    expect(items.value).toEqual([])
  })
})
