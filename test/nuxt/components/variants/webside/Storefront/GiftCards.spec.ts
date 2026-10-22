import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import WebsideGiftCards from '~/components/variants/webside/Storefront/GiftCards.vue'
import { makePayWay } from '~~/test/fixtures/payWay'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * Webside's gift-card page offers a card payment through each provider
 * whose pay way settles online and is active; the choice appears once
 * there are two. One `createApiMock` answers `$api` (the pay-way list,
 * the purchase) and `$fetch` (the settings behind the amount bounds).
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

// Stripe's script is a network load; the card element is not under test.
mockNuxtImport('useScriptStripe', () => () => ({ onLoaded: () => {} }))

const VIVA = makePayWay({ id: 1, providerCode: 'viva_wallet', settlement: 'online' })

async function mountWith(payWays: ReturnType<typeof makePayWay>[]) {
  api.routes({
    '/api/settings/public': () => ({ settings: {} }),
    '/api/pay-way': { count: payWays.length, results: payWays },
    '/api/giftcard/purchase': {
      purchaseUuid: 'a1b2c3d4-0000-4000-8000-000000000001',
      provider: 'viva_wallet',
      amount: 50,
      currency: 'EUR',
    },
  })
  const wrapper = await mountSuspended(WebsideGiftCards, { route: false })
  await flushPromises()
  return wrapper
}

// The provider choice is the page's only radio group.
const providerRadios = (wrapper: VueWrapper) => wrapper.findAll('[role="radio"]')

async function purchase(wrapper: VueWrapper) {
  const [buyer, recipient] = wrapper.findAll('input[type="email"]')
  await buyer!.setValue('buyer@example.com')
  await recipient!.setValue('eleni@example.com')
  await wrapper.find('form').trigger('submit')
  await flushPromises()
  return api.callsTo('/api/giftcard/purchase').at(-1)?.options.body as Record<string, unknown> | undefined
}

describe('webside gift cards: payment providers', () => {
  beforeEach(() => {
    clearNuxtData('gift-cards:pay-ways')
    setTenant({ stripePublishableKey: 'pk_test_123' })
  })

  it('offers each provider whose pay way settles online', async () => {
    const stripe = makePayWay({ id: 2, providerCode: 'stripe', settlement: 'online' })

    expect(providerRadios(await mountWith([VIVA, stripe]))).toHaveLength(2)
  })

  it('pays through the one provider left when the other does not settle online', async () => {
    const stripe = makePayWay({ id: 2, providerCode: 'stripe', settlement: 'offline_transfer' })
    const wrapper = await mountWith([VIVA, stripe])

    // No choice to make: Stripe is not offered...
    expect(providerRadios(wrapper)).toHaveLength(0)
    // ...and the purchase still goes through Viva Wallet.
    expect(await purchase(wrapper)).toMatchObject({ paymentProvider: 'viva_wallet' })
  })
})
