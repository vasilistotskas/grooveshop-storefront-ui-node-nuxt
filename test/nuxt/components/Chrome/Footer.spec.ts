import { describe, it, expect, beforeEach, vi } from 'vitest'
import { computed, ref } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import ChromeFooter from '~/components/Chrome/Footer.vue'
import { makePayWay } from '~~/test/fixtures/payWay'
import type { TenantConfig } from '~~/shared/openapi/types.gen'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'

/**
 * The default footer. What it must get right:
 *
 * - the seller can be reached: phone and email are links, on the desk
 *   row and as the phone's call/email buttons;
 * - the legal identity block is mounted (what it prints is
 *   `MerchantIdentity.spec.ts`);
 * - the ways to pay are the store's ACTIVE pay ways, plus gift cards
 *   only behind both of their gates — never a promise checkout breaks;
 * - the agent-ready mark only for a store that serves agents;
 * - "cookie settings" opens the consent preferences.
 */
const { state } = vi.hoisted(() => ({
  state: {
    identity: null as { phone: string, email: string } | null,
    payWays: [] as unknown[],
    payWayRequests: 0,
    cookieModal: { value: false },
  },
}))

mockNuxtImport('useFooterNavigation', () => () => ({
  primary: computed(() => [{ label: 'Κατάστημα', children: [{ label: 'Όλα', to: '/products' }] }]),
  secondary: computed(() => [{ label: 'Όροι χρήσης', to: '/terms-of-use' }]),
}))
mockNuxtImport('useMerchantIdentity', () => () => ({
  identity: computed(() => state.identity),
}))
// A disabled request is never made and leaves no data, as in Nuxt.
mockNuxtImport('useApi', () => (url: string, options?: { enabled?: MaybeRefOrGetter<boolean> }) => {
  if (url !== '/api/pay-way' || toValue(options?.enabled) === false) return Promise.resolve({ data: ref(null) })
  state.payWayRequests++
  return Promise.resolve({ data: ref({ results: state.payWays }) })
})
mockNuxtImport('useCookieControl', () => () => ({
  isModalActive: computed({
    get: () => state.cookieModal.value,
    set: (value: boolean) => { state.cookieModal.value = value },
  }),
}))

const stubs = {
  ChromeFooterNewsletter: true,
  MerchantIdentity: { template: '<address data-test="identity" />' },
  FooterHoursBadge: true,
  LanguageSwitcher: true,
  TenantLogo: true,
}

const mountFooter = () => mountSuspended(ChromeFooter, { route: false, global: { stubs } })

/** The footer's own copy (el), which the global `$i18n` cannot reach. */
const COPY = { giftCard: 'Δωροκάρτα', agentReady: 'Έτοιμο για AI agents', cookieSettings: 'Ρυθμίσεις cookies' }

describe('Chrome/Footer', () => {
  beforeEach(() => {
    state.identity = null
    state.payWays = []
    state.payWayRequests = 0
    state.cookieModal.value = false
    setTenant({ giftCardsEnabled: false, agentCommerceEnabled: false, availableLocales: ['el'], metaPixelId: '123' })
    setTenantFeatures({ giftCards: false })
  })

  it('prints the store\'s description in the shopper\'s locale', async () => {
    setTenant({ storeDescription: 'Ελληνική περιγραφή', storeDescriptionI18n: { en: 'English description' }, availableLocales: ['el', 'en'] })
    const i18n = useNuxtApp().$i18n

    expect((await mountFooter()).text()).toContain('Ελληνική περιγραφή')

    await i18n.setLocale('en')
    try {
      const wrapper = await mountFooter()
      expect(wrapper.text()).toContain('English description')
      expect(wrapper.text()).not.toContain('Ελληνική περιγραφή')
    }
    finally {
      await i18n.setLocale('el')
    }
  })

  it('makes the seller reachable by phone and email', async () => {
    state.identity = { phone: '+302310000000', email: 'hello@shop.test' }

    const wrapper = await mountFooter()

    // The desk row's link and the phone's button — one each per channel.
    expect(wrapper.findAll('a[href="tel:+302310000000"]')).toHaveLength(2)
    expect(wrapper.findAll('a[href="mailto:hello@shop.test"]')).toHaveLength(2)
  })

  it('mounts the legal identity', async () => {
    const wrapper = await mountFooter()

    expect(wrapper.find('[data-test="identity"]').exists()).toBe(true)
  })

  // The identity is an <address>, which no <p> may hold: the browser's
  // parser closes the paragraph in front of it, the server's DOM stops
  // matching the client's, and every page hydrated with a mismatch.
  it('never puts the legal identity inside a paragraph', async () => {
    const wrapper = await mountFooter()

    expect(wrapper.find('[data-test="identity"]').element.closest('p')).toBeNull()
  })

  it('lists the store\'s active pay ways in the shopper\'s words', async () => {
    // A pay way's `key` is its `PayWayEnum` key, as checkout reads it.
    state.payWays = [
      makePayWay({ key: 'CREDIT_CARD' }),
      makePayWay({ key: 'PAY_ON_DELIVERY' }),
    ]

    const wrapper = await mountFooter()

    const { t } = useNuxtApp().$i18n
    expect(wrapper.text()).toContain(t('payment_methods.CREDIT_CARD'))
    expect(wrapper.text()).toContain(t('payment_methods.PAY_ON_DELIVERY'))
    expect(wrapper.text()).not.toContain('PAY_ON_DELIVERY')
  })

  it('lists a way to pay once when two pay ways share it', async () => {
    // Card payments through two processors are one way to pay.
    state.payWays = [
      makePayWay({ key: 'CREDIT_CARD' }),
      makePayWay({ key: 'CREDIT_CARD' }),
    ]

    const wrapper = await mountFooter()

    const card = useNuxtApp().$i18n.t('payment_methods.CREDIT_CARD')
    // Once in the desk row and once in the phone row.
    expect(wrapper.text().split(card).length - 1).toBe(2)
  })

  it('promises no way to pay and no carrier on a store without the cart', async () => {
    setTenant({ agentCommerceEnabled: false, availableLocales: ['el'], shippingCarriers: [{ code: 'acs', name: 'ACS' }] })
    setTenantFeatures({ cart: false, giftCards: true })
    state.payWays = [makePayWay({ key: 'CREDIT_CARD' })]

    const wrapper = await mountFooter()

    const text = wrapper.text()
    expect(state.payWayRequests).toBe(0)
    expect(text).not.toContain(useNuxtApp().$i18n.t('payment_methods.CREDIT_CARD'))
    expect(text).not.toContain(COPY.giftCard)
    expect(text).not.toContain('ACS')
  })

  it('names the carriers under "Delivered by", on the desk and the phone', async () => {
    setTenant({ agentCommerceEnabled: false, availableLocales: ['el'], shippingCarriers: [{ code: 'acs', name: 'ACS' }, { code: 'boxnow', name: 'BOX NOW' }] })

    const wrapper = await mountFooter()

    const text = wrapper.text()
    expect(text).toContain('Αποστολή με')
    for (const name of ['ACS', 'BOX NOW']) {
      // Once in the desk column and once in the phone row.
      expect(text.split(name).length - 1).toBe(2)
    }
  })

  it('draws no "Delivered by" row for a store with no carriers', async () => {
    setTenant({ agentCommerceEnabled: false, availableLocales: ['el'], shippingCarriers: [] })

    const wrapper = await mountFooter()

    expect(wrapper.text()).not.toContain('Αποστολή')
  })

  it.each<{ name: string, tenant: Partial<TenantConfig>, feature: boolean, shown: boolean }>([
    { name: 'the plan flag on, the feature off', tenant: { giftCardsEnabled: true }, feature: false, shown: false },
    { name: 'the feature on, the plan flag off', tenant: { giftCardsEnabled: false }, feature: true, shown: true },
  ])('offers gift cards as a way to pay with $name: $shown', async ({ tenant, feature, shown }) => {
    setTenant({ agentCommerceEnabled: false, availableLocales: ['el'], ...tenant })
    setTenantFeatures({ giftCards: feature })
    state.payWays = [makePayWay({ key: 'VIVA_WALLET' })]

    const wrapper = await mountFooter()

    expect(wrapper.text().includes(COPY.giftCard)).toBe(shown)
  })

  it('shows the agent-ready mark only for a store that serves agents', async () => {
    expect((await mountFooter()).text()).not.toContain(COPY.agentReady)

    setTenant({ agentCommerceEnabled: true, availableLocales: ['el'] })
    expect((await mountFooter()).text()).toContain(COPY.agentReady)
  })

  it('has no cookie settings for a store with no optional service', async () => {
    setTenant({ availableLocales: ['el'], gaTrackingId: '', googleAdsConversionId: '', metaPixelId: '', tiktokPixelId: '', openaiPixelId: '' })

    const wrapper = await mountFooter()

    expect(wrapper.findAll('button').some(candidate => candidate.text() === COPY.cookieSettings)).toBe(false)
  })

  it('opens the cookie preferences', async () => {
    const wrapper = await mountFooter()
    const button = wrapper.findAll('button').find(candidate => candidate.text() === COPY.cookieSettings)!

    await button.trigger('click')

    expect(state.cookieModal.value).toBe(true)
  })
})
