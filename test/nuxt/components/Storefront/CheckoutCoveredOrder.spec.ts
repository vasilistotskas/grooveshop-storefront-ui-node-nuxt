import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { computed, defineComponent, h, reactive, ref } from 'vue'
import Checkout from '~/components/Storefront/Checkout.vue'
import WebsideCheckout from '~/components/variants/webside/Storefront/Checkout.vue'
import { useCartStore } from '~/stores/cart'
import { makeCart } from '~~/test/fixtures/cart'
import { makeOrder } from '~~/test/fixtures/order'
import { makePayWay } from '~~/test/fixtures/payWay'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * An order placed with an online pay way that the deductions (a gift card,
 * a promotion, points) cover whole comes back from Django already paid. The
 * page goes straight to the success page, in both trees and for both
 * providers: it never opens the provider's payment step (which asks for a
 * payment session Django refuses with `order_not_payable`), shows no
 * payment error, and releases no holds Django already turned into the order.
 * The submit is the REAL `useCheckoutSubmit`, driven through the page.
 *
 * Its own file because `Checkout.spec.ts` replaces `useCheckoutSubmit`,
 * and a file mocks an auto-import once.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

const m = vi.hoisted(() => ({
  toastAdd: vi.fn(),
  navigateTo: vi.fn(() => Promise.resolve()),
  reserveStock: vi.fn(() => Promise.resolve([42])),
  releaseReservations: vi.fn(() => Promise.resolve()),
  consent: { value: [] as string[] },
  // The pay way the form holds; each test picks its provider.
  payWay: { value: null as unknown },
}))

mockNuxtImport('useToast', () => () => ({ add: m.toastAdd, update: vi.fn() }))
mockNuxtImport('navigateTo', () => m.navigateTo)
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(false),
  user: ref(null),
  session: ref({}),
  ready: ref(true),
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))
mockNuxtImport('useCheckout', () => () => ({
  reserveStock: m.reserveStock,
  releaseReservations: m.releaseReservations,
}))
mockNuxtImport('useCookieControl', () => () => ({ cookiesEnabledIds: m.consent, isConsentGiven: ref(false) }))
mockNuxtImport('useMetaPixel', () => () => ({ newEventId: () => 'e', trackInitiateCheckout: () => 'e', trackAddPaymentInfo: () => 'e' }))
mockNuxtImport('useTikTokPixel', () => () => ({ trackInitiateCheckout: vi.fn(), trackAddPaymentInfo: vi.fn() }))
mockNuxtImport('useOpenAIPixel', () => () => ({ trackCheckoutStarted: vi.fn() }))
mockNuxtImport('useGoogleAds', () => () => ({ trackBeginCheckout: vi.fn(), trackAddPaymentInfo: vi.fn() }))
mockNuxtImport('useGA4', () => () => ({ trackBeginCheckout: vi.fn(), trackAddPaymentInfo: vi.fn() }))
// The quote the page shows and the order is placed at (its own spec is
// `useCheckoutQuote.spec.ts`).
const QUOTE = await vi.hoisted(async () => (await import('~~/test/fixtures/checkoutQuote')).makeCartQuote())
mockNuxtImport('useCheckoutQuote', () => () => ({
  quote: computed(() => QUOTE),
  quotedFor: computed(() => null),
  pending: computed(() => false),
  refusal: computed(() => null),
  current: () => Promise.resolve({ quote: QUOTE, error: null }),
  refresh: () => Promise.resolve(),
}))

const STRIPE = makePayWay({ id: 1, providerCode: 'stripe', settlement: 'online' })
const VIVA = makePayWay({ id: 1, providerCode: 'viva_wallet', settlement: 'online' })

mockNuxtImport('useCheckoutForm', () => () => ({
  formState: reactive({
    payWayId: 1,
    payWay: 1,
    countryId: 1,
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    street: 'Main St',
    streetNumber: '1',
    city: 'Athens',
    zipcode: '10001',
    phone: '+306901234567',
    customerNotes: '',
    documentType: 'RECEIPT',
    billingVatId: '',
    billingCountry: '',
    shippingMethod: 'home_delivery',
    saveAddress: false,
  }),
  selectedPayWay: m.payWay,
  selectedCountry: ref(undefined),
  payWays: computed(() => ({ count: 1, results: [m.payWay.value] })),
  countryOptions: ref([]),
  postcodeExample: ref(''),
  regionOptions: ref([]),
  payWayOptions: ref([]),
  step1Schema: {},
  step2Schema: {},
  step3Schema: {},
  savedAddresses: ref([]),
  selectedSavedAddressId: ref(null),
  selectSavedAddress: vi.fn(),
  addressEntryMode: ref('new'),
  useNewAddress: vi.fn(),
  editSelectedAddress: vi.fn(),
  addressIdsNeedingUpdate: ref([]),
  b2bInvoicingEnabled: ref(false),
  acsEnabled: ref(false),
  refetchShippingOptions: vi.fn(() => Promise.resolve(true)),
  shippingOptionsError: ref(null),
  shippingOverWeight: ref(false),
  retryShippingOptions: vi.fn(),
  shippingOptions: ref([]),
}))

/** The payment step, reduced to the button that submits the order. */
const PaymentStep = defineComponent({
  name: 'CheckoutStepPayment',
  emits: ['submit'],
  setup(_props, { emit, expose }) {
    expose({ submit: () => emit('submit') })
    return () => h('button', { 'data-testid': 'place-order', 'onClick': () => emit('submit') }, 'order')
  },
})
/** An earlier step, reduced to the button that moves the shopper on. */
const NextStep = (name: string) => defineComponent({
  name,
  emits: ['next'],
  setup(_props, { emit, expose }) {
    expose({ submit: () => emit('next') })
    return () => h('button', { 'data-testid': 'next', 'onClick': () => emit('next') }, 'next')
  },
})
const Quiet = (name: string) => defineComponent({ name, setup: () => () => h('div') })
const QUIET = ['CheckoutItems', 'CheckoutCouponInput', 'CheckoutGiftCardInput', 'CheckoutPointsEarned', 'CheckoutGuestLoyaltyCTA', 'CheckoutPointsPanel', 'LoyaltyRedemption', 'CheckoutLegalFooter', 'CheckoutSidebar']

/**
 * The provider's payment step: mounting it is what asks Django for a
 * payment session (Stripe's checkout session, Viva's order code), so the
 * stub counts its mounts.
 */
const opened = { count: 0 }
const OnlinePaymentView = defineComponent({
  name: 'CheckoutOnlinePaymentView',
  setup() {
    opened.count++
    return () => h('div', { 'data-testid': 'online-payment' })
  },
})

const t = (key: string, params: Record<string, unknown> = {}) => useNuxtApp().$i18n.t(key, params)

describe.each([
  ['default', Checkout, ''],
  ['webside', WebsideCheckout, 'Webside'],
])('the %s checkout page', (_tree, Page, prefix) => {
  beforeEach(() => {
    setTenant()
    useCartStore().cart = makeCart()
    m.consent.value = []
    opened.count = 0
    window.sessionStorage.clear()
  })

  async function placeOrder(order: ReturnType<typeof makeOrder>): Promise<VueWrapper> {
    api.routes({
      '/api/orders': () => order,
      '/api/*': () => ({}),
    })
    const wrapper = await mountSuspended(Page, {
      route: false,
      global: {
        stubs: {
          // The webside tree has its own copy of each part, named with a prefix.
          ...Object.fromEntries(QUIET.flatMap(name => [[name, Quiet(name)], [`${prefix}${name}`, Quiet(name)]])),
          [`${prefix}CheckoutOnlinePaymentView`]: OnlinePaymentView,
          [`${prefix}CheckoutStepPersonalInfo`]: NextStep('CheckoutStepPersonalInfo'),
          [`${prefix}CheckoutStepShipping`]: NextStep('CheckoutStepShipping'),
          [`${prefix}CheckoutStepPayment`]: PaymentStep,
        },
      },
    })
    await flushPromises()
    // Personal info, then shipping, then payment.
    for (let step = 0; step < 2; step++) {
      await wrapper.get('[data-testid="next"]').trigger('click')
      await flushPromises()
    }
    await wrapper.get('[data-testid="place-order"]').trigger('click')
    await flushPromises()
    return wrapper
  }

  describe.each([
    ['Stripe', STRIPE],
    ['Viva Wallet', VIVA],
  ])('with %s', (_provider, payWay) => {
    beforeEach(() => {
      m.payWay.value = payWay
    })

    it('goes straight to the success page for an order the deductions paid whole', async () => {
      const wrapper = await placeOrder(makeOrder({ uuid: 'order-covered', paymentStatus: 'COMPLETED' }))

      expect(opened.count).toBe(0)
      expect(wrapper.find('[data-testid="online-payment"]').exists()).toBe(false)
      expect(m.navigateTo).toHaveBeenCalledWith(useLocalePath()({ name: 'checkout-success' }))
      expect(m.releaseReservations).not.toHaveBeenCalled()
      expect(m.toastAdd).not.toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
      expect(m.toastAdd).not.toHaveBeenCalledWith(expect.objectContaining({ title: t('payment_failed') }))
    })

    it('opens the payment step for an order left to be paid', async () => {
      const wrapper = await placeOrder(makeOrder({ uuid: 'order-due', paymentStatus: 'PENDING' }))

      expect(opened.count).toBe(1)
      expect(wrapper.find('[data-testid="online-payment"]').exists()).toBe(true)
      expect(m.navigateTo).not.toHaveBeenCalledWith(useLocalePath()({ name: 'checkout-success' }))
    })
  })
})
