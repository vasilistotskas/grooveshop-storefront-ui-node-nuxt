import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import WebsideGiftCards from '~/components/variants/webside/Storefront/GiftCards.vue'
import { makePayWay } from '~~/test/fixtures/payWay'
import { failWith } from '~~/test/helpers/api'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * Webside's gift-card page offers a card payment through each provider
 * whose pay way settles online and is active; the choice appears once
 * there are two. One `createApiMock` answers `$api` (the pay-way list,
 * the purchase) and `$fetch` (the settings behind the amount bounds).
 * The purchase itself is `useGiftCardPurchase`, the default page's too.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

// Stripe's script is a network load; the card element is not under test.
mockNuxtImport('useScriptStripe', () => () => ({ onLoaded: () => {} }))

const VIVA = makePayWay({ id: 1, providerCode: 'viva_wallet', settlement: 'online' })

async function mountWith(payWays: ReturnType<typeof makePayWay>[], settings: Record<string, string> = {}) {
  api.routes({
    '/api/settings/public': () => ({ settings }),
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

describe('webside gift cards: the amount and the purchase', () => {
  beforeEach(() => {
    clearNuxtData(['gift-cards:pay-ways', 'store-settings'])
    setTenant({ stripePublishableKey: 'pk_test_123' })
  })

  const money = (value: number) => useNuxtApp().$i18n.n(value, 'currency')
  // Prices are printed with a no-break space before the €.
  const text = (wrapper: VueWrapper) => wrapper.text().replace(/\u00A0/g, ' ')

  it('states the store\'s range, beside the amount and among the benefits', async () => {
    const wrapper = await mountWith([VIVA], { GIFT_CARD_MIN_AMOUNT: '10.00', GIFT_CARD_MAX_AMOUNT: '500.00' })

    const range = `Από ${money(10)} έως ${money(500)}`.replace(/\u00A0/g, ' ')
    expect(text(wrapper)).toContain(range)
    expect(text(wrapper)).toContain('Εσύ επιλέγεις το ποσό')
  })

  it('claims no range it could not read, and leaves the amount to Django', async () => {
    const wrapper = await mountWith([VIVA])

    expect(text(wrapper)).not.toContain('Από ')
    expect(text(wrapper)).not.toContain('Εσύ επιλέγεις το ποσό')
    const typed = wrapper.get('input[inputmode]')
    await typed.setValue('2000')
    // The number field commits what was typed when it loses focus.
    await typed.trigger('blur')

    expect(await purchase(wrapper)).toMatchObject({ amount: 2000 })
  })

  it('does not start a purchase over the store\'s maximum', async () => {
    const wrapper = await mountWith([VIVA], { GIFT_CARD_MAX_AMOUNT: '40' })

    expect(await purchase(wrapper)).toBeUndefined()
    expect(text(wrapper)).toContain('Μέγιστο ποσό 40 €')
  })

  it('sends what the buyer typed, with the provider', async () => {
    const wrapper = await mountWith([VIVA])

    expect(await purchase(wrapper)).toEqual({
      amount: 50,
      buyerEmail: 'buyer@example.com',
      recipientEmail: 'eleni@example.com',
      recipientName: undefined,
      senderName: undefined,
      message: undefined,
      deliverAt: undefined,
      paymentProvider: 'viva_wallet',
    })
  })

  it('tells the buyer why the purchase did not start', async () => {
    const wrapper = await mountWith([VIVA])
    api.routes({ '/api/giftcard/purchase': failWith(400, { detail: 'Το ποσό δεν είναι έγκυρο' }) })

    await purchase(wrapper)

    expect(text(wrapper)).toContain('Το ποσό δεν είναι έγκυρο')
  })

  it('says, in its own words, that no online payment is offered', async () => {
    const wrapper = await mountWith([])

    expect(await purchase(wrapper)).toBeUndefined()
    expect(text(wrapper)).toContain('Δεν υπάρχει διαθέσιμος τρόπος online πληρωμής')
  })
})
