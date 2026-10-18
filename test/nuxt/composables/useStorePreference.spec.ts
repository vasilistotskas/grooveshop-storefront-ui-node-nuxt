import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { failWith } from '~~/test/helpers/api'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const SETTINGS = '/api/settings/public'
const POLL = { interval: 1 }

function read<T>(readers: () => T) {
  let out!: ReturnType<typeof useStoreSettings> & { result: T }
  useNuxtApp().runWithContext(() => {
    out = { ...useStoreSettings(), result: readers() }
  })
  return out
}

describe('useStorePreference', () => {
  beforeEach(() => {
    clearNuxtData()
  })

  it('reads the stored value, whichever way the row is spelled', async () => {
    api.routes({ [SETTINGS]: { settings: { MOBILE_BOTTOM_NAV_ENABLED: 'False', RECENTLY_VIEWED_ENABLED: 'yes' } } })

    const { result: [nav, recent] } = read(() => [
      useStorePreference('MOBILE_BOTTOM_NAV_ENABLED'),
      useStorePreference('RECENTLY_VIEWED_ENABLED'),
    ])

    await vi.waitFor(() => expect(recent!.value).toBe(true), POLL)
    expect(nav!.value).toBe(false)
  })

  it('answers each preference\'s own default for a missing row', async () => {
    api.routes({ [SETTINGS]: { settings: { UNRELATED: 'x' } } })

    const { settings, result } = read(() => ({
      cart: useStorePreference('CART_ENABLED'),
      catalogue: useStorePreference('CATALOGUE_ENABLED'),
      recent: useStorePreference('RECENTLY_VIEWED_ENABLED'),
      demo: useStorePreference('DEMO_ACCOUNT_ENABLED'),
    }))
    await vi.waitFor(() => expect(settings.value).toEqual({ UNRELATED: 'x' }), POLL)

    expect(result.cart.value).toBe(STORE_PREFERENCES.CART_ENABLED)
    expect(result.catalogue.value).toBe(true)
    expect(result.recent.value).toBe(false)
    expect(result.demo.value).toBe(false)
  })
})

describe('storePreferenceEnabled', () => {
  beforeEach(() => {
    clearNuxtData()
  })

  it('reads the stored value for a plugin or a gate', async () => {
    api.routes({ [SETTINGS]: { settings: { CART_ENABLED: 'False' } } })

    expect(await storePreferenceEnabled('CART_ENABLED')).toBe(false)
  })

  it('uses the preference default for a missing row and for an unreadable endpoint', async () => {
    api.routes({ [SETTINGS]: { settings: {} } })
    expect(await storePreferenceEnabled('CATALOGUE_ENABLED')).toBe(true)
    expect(await storePreferenceEnabled('RECENTLY_VIEWED_ENABLED')).toBe(false)

    clearNuxtData()
    api.routes({ [SETTINGS]: failWith(503) })
    expect(await storePreferenceEnabled('CART_ENABLED')).toBe(true)
  })
})
