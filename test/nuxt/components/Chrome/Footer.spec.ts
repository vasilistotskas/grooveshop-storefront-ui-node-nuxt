import { describe, it, expect, beforeEach, vi } from 'vitest'
import { computed, ref } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import ChromeFooter from '~/components/Chrome/Footer.vue'
import { makePayWay } from '~~/test/fixtures/payWay'
import type { TenantConfig } from '~~/shared/openapi/types.gen'
import { setTenant } from '~~/test/helpers/tenant'

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
    flags: {} as Record<string, boolean>,
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
mockNuxtImport('useApi', () => (url: string) =>
  Promise.resolve({ data: ref(url === '/api/pay-way' ? { results: state.payWays } : null) }))
mockNuxtImport('useSettingFlag', () => (key: string, options: { fallback: boolean }) =>
  computed(() => state.flags[key] ?? options.fallback))
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
    state.flags = {}
    state.cookieModal.value = false
    setTenant({ giftCardsEnabled: false, agentCommerceEnabled: false, availableLocales: ['el'] })
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
    // A pay way's name is its `PayWayEnum` key, as checkout reads it.
    state.payWays = [
      makePayWay({ translations: { el: { name: 'CREDIT_CARD' } } }),
      makePayWay({ translations: { el: { name: 'PAY_ON_DELIVERY' } } }),
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
      makePayWay({ translations: { el: { name: 'CREDIT_CARD' } } }),
      makePayWay({ translations: { el: { name: 'CREDIT_CARD' } } }),
    ]

    const wrapper = await mountFooter()

    const card = useNuxtApp().$i18n.t('payment_methods.CREDIT_CARD')
    // Once in the desk row and once in the phone row.
    expect(wrapper.text().split(card).length - 1).toBe(2)
  })

  it.each<{ name: string, tenant: Partial<TenantConfig>, flags: Record<string, boolean>, shown: boolean }>([
    { name: 'the plan flag only', tenant: { giftCardsEnabled: true }, flags: {}, shown: false },
    { name: 'the setting only', tenant: { giftCardsEnabled: false }, flags: { GIFT_CARDS_ENABLED: true }, shown: false },
    { name: 'both gates', tenant: { giftCardsEnabled: true }, flags: { GIFT_CARDS_ENABLED: true }, shown: true },
  ])('offers gift cards as a way to pay with $name: $shown', async ({ tenant, flags, shown }) => {
    setTenant({ agentCommerceEnabled: false, availableLocales: ['el'], ...tenant })
    state.flags = flags
    state.payWays = [makePayWay({ translations: { el: { name: 'Viva Wallet' } } })]

    const wrapper = await mountFooter()

    expect(wrapper.text().includes(COPY.giftCard)).toBe(shown)
  })

  it('shows the agent-ready mark only for a store that serves agents', async () => {
    expect((await mountFooter()).text()).not.toContain(COPY.agentReady)

    setTenant({ agentCommerceEnabled: true, availableLocales: ['el'] })
    expect((await mountFooter()).text()).toContain(COPY.agentReady)
  })

  it('opens the cookie preferences', async () => {
    const wrapper = await mountFooter()
    const button = wrapper.findAll('button').find(candidate => candidate.text() === COPY.cookieSettings)!

    await button.trigger('click')

    expect(state.cookieModal.value).toBe(true)
  })
})
