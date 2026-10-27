import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { defineComponent, h, reactive, ref } from 'vue'
import Checkout from '~/components/Storefront/Checkout.vue'
import WebsideCheckout from '~/components/variants/webside/Storefront/Checkout.vue'
import { useCartStore } from '~/stores/cart'
import { makeCart } from '~~/test/fixtures/cart'
import { makePayWay } from '~~/test/fixtures/payWay'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * A checkout that Django refuses is explained ON the page, in both trees:
 * the server's reason in an alert that stays until the shopper acts again,
 * and the stable code and request id behind «Λεπτομέρειες» (what the shopper
 * quotes to support). The submit is the REAL `useCheckoutSubmit`, driven
 * through the page; Django's answer is a coded 400 from the `$api` mock,
 * rejected the way ofetch rejects it: the body at `error.data`, the response
 * headers at `error.response`.
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
  createPaymentIntentFromCart: vi.fn(),
}))
mockNuxtImport('useCookieControl', () => () => ({ cookiesEnabledIds: m.consent }))
mockNuxtImport('useMetaPixel', () => () => ({ newEventId: () => 'e', trackInitiateCheckout: () => 'e', trackAddPaymentInfo: () => 'e' }))
mockNuxtImport('useTikTokPixel', () => () => ({ trackInitiateCheckout: vi.fn(), trackAddPaymentInfo: vi.fn() }))
mockNuxtImport('useOpenAIPixel', () => () => ({ trackCheckoutStarted: vi.fn() }))
mockNuxtImport('useGoogleAds', () => () => ({ trackBeginCheckout: vi.fn(), trackAddPaymentInfo: vi.fn() }))
mockNuxtImport('useGA4', () => () => ({ trackBeginCheckout: vi.fn(), trackAddPaymentInfo: vi.fn() }))

const COD = makePayWay({ id: 1 })

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
  selectedPayWay: ref(COD),
  selectedCountry: ref(undefined),
  payWays: ref({ count: 1, results: [COD] }),
  shippingPrice: ref(0),
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
const QUIET = ['CheckoutItems', 'CheckoutCouponInput', 'CheckoutGiftCardInput', 'CheckoutPointsEarned', 'CheckoutGuestLoyaltyCTA', 'CheckoutPointsPanel', 'LoyaltyRedemption', 'CheckoutOnlinePaymentView', 'CheckoutLegalFooter', 'CheckoutSidebar']

/**
 * Django refused the order: ofetch rejects with a FetchError whose `data` is
 * the body and whose response carries the request id (the checkout reads
 * the refusal from it).
 */
const refused = (body: Record<string, unknown>, requestId = 'req-checkout-42') => () => {
  const response = { ok: false, status: 400, _data: body, headers: new Headers({ 'x-request-id': requestId }) }
  throw Object.assign(new Error('400 Bad Request'), { status: 400, statusCode: 400, response, data: body })
}

const t = (key: string, params: Record<string, unknown> = {}) => useNuxtApp().$i18n.t(key, params)

describe.each([
  ['default', Checkout, ''],
  ['webside', WebsideCheckout, 'Webside'],
])('the %s checkout page, when Django refuses the order', (_tree, Page, prefix) => {
  beforeEach(() => {
    setTenant()
    useCartStore().cart = makeCart()
    m.consent.value = []
    window.sessionStorage.clear()
  })

  async function placeOrder(body: Record<string, unknown>): Promise<VueWrapper> {
    api.routes({ '/api/orders': refused(body) })
    const wrapper = await mountSuspended(Page, {
      route: false,
      global: {
        stubs: {
          // The webside tree has its own copy of each part, named with a prefix.
          ...Object.fromEntries(QUIET.flatMap(name => [[name, Quiet(name)], [`${prefix}${name}`, Quiet(name)]])),
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

  it('shows the reason Django gave in an alert, and the code and request id behind the details', async () => {
    const wrapper = await placeOrder({
      detail: 'Το προϊόν «Μπλούζα» δεν διατίθεται πια.',
      code: 'product_unavailable',
    })

    const alert = wrapper.get('[role="alert"]')
    expect(alert.text()).toContain('Το προϊόν «Μπλούζα» δεν διατίθεται πια.')
    expect(alert.text()).not.toContain('product_unavailable')

    const details = wrapper.findAll('button').filter(button => button.text() === t('error.details'))
    expect(details).toHaveLength(1)
    await details[0]!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain(`${t('error.code_label')}: product_unavailable`)
    expect(wrapper.text()).toContain(`${t('error.request_id_label')}: req-checkout-42`)
    // The alert is the explanation: no toast repeats it.
    expect(m.toastAdd).not.toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
  })
})
