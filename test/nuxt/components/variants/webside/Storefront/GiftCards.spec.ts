import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import WebsideGiftCards from '~/components/variants/webside/Storefront/GiftCards.vue'
import { makePayWay } from '~~/test/fixtures/payWay'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * Webside's gift-card page offers a card payment through each provider
 * whose pay way settles online and is active; the choice appears once
 * there are two. One `createApiMock` answers `$api` (the pay-way list)
 * and `$fetch` (the settings behind the amount bounds).
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

// Stripe's script is a network load; the card element is not under test.
mockNuxtImport('useScriptStripe', () => () => ({ onLoaded: () => {} }))

const VIVA = makePayWay({ id: 1, providerCode: 'viva_wallet', settlement: 'online' })

async function providerRadios(payWays: ReturnType<typeof makePayWay>[]) {
  api.routes({
    '/api/settings/public': () => ({ settings: {} }),
    '/api/pay-way': { count: payWays.length, results: payWays },
  })
  const wrapper = await mountSuspended(WebsideGiftCards, { route: false })
  await flushPromises()
  // The provider choice is the page's only radio group.
  return wrapper.findAll('[role="radio"]')
}

describe('webside gift cards: payment providers', () => {
  beforeEach(() => {
    clearNuxtData('gift-cards:pay-ways')
    setTenant({ stripePublishableKey: 'pk_test_123' })
  })

  it('offers each provider whose pay way settles online', async () => {
    const stripe = makePayWay({ id: 2, providerCode: 'stripe', settlement: 'online' })

    expect(await providerRadios([VIVA, stripe])).toHaveLength(2)
  })

  it('leaves out a provider whose pay way does not settle online', async () => {
    const stripe = makePayWay({ id: 2, providerCode: 'stripe', settlement: 'offline_transfer' })

    expect(await providerRadios([VIVA, stripe])).toHaveLength(0)
  })
})
