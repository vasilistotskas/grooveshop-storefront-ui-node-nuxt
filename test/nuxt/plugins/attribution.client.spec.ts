import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import attributionPlugin from '~/plugins/attribution.client'
import { validTenantConfig } from '~~/test/fixtures/tenantConfig'

/**
 * The landing page's traffic source is stored for the order it may lead
 * to, so only a store that can take an order stores it: elsewhere it sat
 * in every visitor's sessionStorage with nothing to read it. The cart is
 * the store's `cart` preference, read from the tenant state the plugin
 * runs with (the tenant store is filled only after the plugins).
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const run = () => (attributionPlugin as unknown as () => void)()
const stored = () => window.sessionStorage.getItem('order-attribution')

function storeWithCart(cart: boolean) {
  const config = validTenantConfig('test.local')
  useTenant().value = { ...config, features: { ...config.features, cart } }
}

describe('attribution plugin', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    window.history.replaceState(null, '', '/products?utm_source=newsletter')
  })

  it('records the landing on a store with the cart on', () => {
    storeWithCart(true)

    run()

    expect(JSON.parse(stored()!)).toMatchObject({ utmSource: 'newsletter', landingPath: '/products' })
  })

  it('stores nothing on a store with the cart off', () => {
    storeWithCart(false)

    run()

    expect(stored()).toBeNull()
  })

  it('asks the settings endpoint for nothing', () => {
    storeWithCart(true)

    run()

    expect(api.callsTo('/api/settings/public')).toEqual([])
  })
})
