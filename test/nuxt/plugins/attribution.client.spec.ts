import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import attributionPlugin from '~/plugins/attribution.client'
import { failWith } from '~~/test/helpers/api'

/**
 * The landing page's traffic source is stored for the order it may lead
 * to, so only a store that can take an order stores it: elsewhere it sat
 * in every visitor's sessionStorage with nothing to read it.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const run = () => (attributionPlugin as unknown as () => Promise<void>)()
const stored = () => window.sessionStorage.getItem('order-attribution')

describe('attribution plugin', () => {
  beforeEach(() => {
    clearNuxtData([STORE_SETTINGS_KEY])
    window.sessionStorage.clear()
    window.history.replaceState(null, '', '/products?utm_source=newsletter')
  })

  it('records the landing on a store with the cart on', async () => {
    api.routes({ '/api/settings/public': { settings: { CART_ENABLED: 'True' } } })

    await run()

    expect(JSON.parse(stored()!)).toMatchObject({ utmSource: 'newsletter', landingPath: '/products' })
  })

  it('stores nothing on a store with the cart off', async () => {
    api.routes({ '/api/settings/public': { settings: { CART_ENABLED: 'False' } } })

    await run()

    expect(stored()).toBeNull()
  })

  it('fails open like the cart, when the settings cannot be read', async () => {
    api.routes({ '/api/settings/public': failWith(502) })

    await run()

    expect(JSON.parse(stored()!)).toMatchObject({ utmSource: 'newsletter' })
  })
})
