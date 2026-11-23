/**
 * The checkout submit orchestration: stock holds, the payment-provider
 * branch (Stripe and Viva order-first / offline), retries, idempotency, and
 * where the shopper lands. What the order body contains and how a
 * rejected order is worded are pure functions with their own unit specs
 * (`test/unit/app/utils/checkoutOrder.spec.ts`,
 * `checkoutAnalytics.spec.ts`); here they run for real inside the flow.
 *
 * `useCheckout` is the HTTP boundary for stock holds (it has its
 * own spec) and is mocked; `/api/orders` and everything else go through
 * the `$api` mock. The cart is the REAL cart store in a fresh Pinia.
 *
 * Not testable here: whether Django actually dedups two requests that
 * carry the same Idempotency-Key.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { setActivePinia, createPinia } from 'pinia'
import { computed, defineComponent, nextTick } from 'vue'
import { useCartStore } from '~/stores/cart'
import { makeCart } from '~~/test/fixtures/cart'
import { CART_DIGEST, makeCartQuote, makeCheckoutQuote, unpricedQuote } from '~~/test/fixtures/checkoutQuote'
import { makeCountry } from '~~/test/fixtures/country'
import { makeOrder } from '~~/test/fixtures/order'
import { makePayWay } from '~~/test/fixtures/payWay'
import { setTenant } from '~~/test/helpers/tenant'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

const m = vi.hoisted(() => ({
  toastAdd: vi.fn(),
  navigateTo: vi.fn(() => Promise.resolve()),
  sessionFetch: vi.fn(() => Promise.resolve()),
  reserveStock: vi.fn(() => Promise.resolve([42])),
  releaseReservations: vi.fn(() => Promise.resolve()),
  consent: { value: [] as string[] },
  meta: {
    newEventId: vi.fn(() => 'purchase-id'),
    trackInitiateCheckout: vi.fn(() => 'initiate-id'),
    trackAddPaymentInfo: vi.fn(() => 'payment-info-id'),
  },
  tiktok: { trackInitiateCheckout: vi.fn(), trackAddPaymentInfo: vi.fn() },
  openai: { trackCheckoutStarted: vi.fn() },
  googleAds: { trackBeginCheckout: vi.fn(), trackAddPaymentInfo: vi.fn() },
  ga4: { trackBeginCheckout: vi.fn(), trackAddPaymentInfo: vi.fn() },
}))

mockNuxtImport('useToast', () => () => ({ add: m.toastAdd }))
mockNuxtImport('navigateTo', () => m.navigateTo)
mockNuxtImport('useLocalePath', () => () => (route: unknown) => route)
mockNuxtImport('useUserSession', () => () => ({ fetch: m.sessionFetch }))
mockNuxtImport('useCheckout', () => () => ({
  reserveStock: m.reserveStock,
  releaseReservations: m.releaseReservations,
}))
mockNuxtImport('useCookieControl', () => () => ({ cookiesEnabledIds: m.consent }))
mockNuxtImport('useMetaPixel', () => () => m.meta)
mockNuxtImport('useTikTokPixel', () => () => m.tiktok)
mockNuxtImport('useOpenAIPixel', () => () => m.openai)
mockNuxtImport('useGoogleAds', () => () => m.googleAds)
mockNuxtImport('useGA4', () => () => m.ga4)

/**
 * The checkout quote (`useCheckoutQuote` has its own spec): `shown` is
 * the quote on the page, `priced` (or `error`) what asking for the
 * current one settles on. `request` is the body the submit asks with.
 */
const q = await vi.hoisted(async () => {
  const { reactive } = await import('vue')
  return reactive({
    shown: null as CheckoutQuote | null,
    priced: null as CheckoutQuote | null,
    error: null as unknown,
    refusalCode: null as string | null,
    pending: false,
    request: null as null | (() => CartQuoteRequestRequest),
    refresh: vi.fn(() => Promise.resolve()),
  })
})
mockNuxtImport('useCheckoutQuote', () => ({ request }: { request: () => CartQuoteRequestRequest }) => {
  q.request = request
  return {
    quote: computed(() => q.shown),
    quotedFor: computed(() => null),
    pending: computed(() => q.pending),
    refusal: computed(() => null),
    refusalCode: computed(() => q.refusalCode),
    current: () => Promise.resolve({ quote: q.priced, error: q.error }),
    refresh: q.refresh,
  }
})

const t = (key: string) => useNuxtApp().$i18n.t(key)

const STRIPE = makePayWay({ id: 1, providerCode: 'stripe', settlement: 'online' })

const CYPRUS = makeCountry({
  translations: { el: { name: 'Κύπρος' }, en: { name: 'Cyprus' } },
  alpha2: 'CY',
  alpha3: 'CYP',
  phoneCode: 357,
  phoneMetadata: null,
  sortOrder: 2,
})
const VIVA = makePayWay({ id: 1, providerCode: 'viva_wallet', settlement: 'online' })
const COD = makePayWay({ id: 1 })

function makeFormState(overrides: Record<string, any> = {}): Record<string, any> {
  return {
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
    ...overrides,
  }
}

/** The checkout the last `setup()` built, to read the failure it is showing. */
let current: ReturnType<typeof useCheckoutSubmit>
const lastFailure = () => current.submitError.value!

function setup(payWay: PayWay, options: {
  formState?: Record<string, any>
  selectedCountry?: Country
  refetchShippingOptions?: () => Promise<boolean>
  shippingOverWeight?: Ref<ShippingOverWeight | null>
} = {}) {
  current = useCheckoutSubmit({
    formState: options.formState ?? makeFormState(),
    selectedPayWay: ref<PayWay | null>(payWay),
    payWays: ref<Pagination<PayWay>>({ count: 1, results: [payWay] }),
    selectedCountry: ref(options.selectedCountry),
    refetchShippingOptions: options.refetchShippingOptions,
    shippingOverWeight: options.shippingOverWeight,
  })
  return current
}

/** Django accepted the order: ofetch resolves with its body. */
const orderCreated = (data: Record<string, unknown> = { uuid: 'order-uuid' }) =>
  () => data

/** Django refused it: ofetch rejects with a FetchError carrying the answer. */
const orderRejected = (status: number, body: unknown) =>
  () => {
    const response = { ok: false, status, _data: body }
    throw Object.assign(new Error(String(status)), { response, data: body })
  }

const orderBodies = () => api.callsTo('/api/orders').map(call => call.options.body)
const lastToast = () => m.toastAdd.mock.calls.at(-1)?.[0] as { title: string, description?: string, color: string }

let cart: ReturnType<typeof useCartStore>

beforeEach(() => {
  setActivePinia(createPinia())
  setTenant()
  cart = useCartStore()
  cart.cart = makeCart()
  m.consent.value = []
  q.shown = makeCartQuote()
  q.priced = makeCartQuote()
  q.error = null
  q.refusalCode = null
  q.pending = false
  window.sessionStorage.clear()
  window.localStorage.clear()
  vi.spyOn(crypto, 'randomUUID').mockReturnValue('0000-idem-key' as `${string}-${string}-${string}-${string}-${string}`)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useCheckoutSubmit', () => {
  describe('Stripe', () => {
    it('posts the order with no payment intent, under one idempotency key, and waits for the payment', async () => {
      api.routes({ '/api/orders': orderCreated({ uuid: 'order-stripe' }) })
      const { onSubmit, createdOrder } = setup(STRIPE)

      await onSubmit()

      const [order] = api.callsTo('/api/orders')
      expect(order!.options.method).toBe('POST')
      expect(order!.options.headers['Idempotency-Key']).toBe('0000-idem-key')
      expect(order!.options.body).toMatchObject({ payWayId: 1, shippingKind: 'home_delivery' })
      expect(order!.options.body).not.toHaveProperty('paymentIntentId')
      // The order is the only request: nothing prices or opens a payment first.
      expect(api.callsTo('/api/cart/create-payment-intent')).toEqual([])
      expect(createdOrder.value).toEqual({ uuid: 'order-stripe' })
      expect(lastToast()).toMatchObject({ title: t('order_created_payment_required'), color: 'info' })
      // The shopper still has to pay: the cart stays, nothing navigates.
      expect(cart.cart).not.toBeNull()
      expect(m.navigateTo).not.toHaveBeenCalled()
    })

    it('sends the E.164 the phone field built from the PICKED country, not the delivery one', async () => {
      api.routes({ '/api/orders': orderCreated() })
      // A Greek mobile (+30, picked in the phone field) delivering to Cyprus.
      const { onSubmit } = setup(STRIPE, {
        formState: makeFormState({ country: 'CY', phone: '+306912345678', phoneCountry: 'GR' }),
        selectedCountry: CYPRUS,
      })

      await onSubmit()

      expect(orderBodies()[0].phone).toBe('+306912345678')
    })

    it('redeems the applied gift cards on the order, once per code', async () => {
      api.routes({ '/api/orders': orderCreated() })
      const { onSubmit, onGiftCardApplied, onGiftCardRemoved } = setup(STRIPE)

      onGiftCardApplied({ code: 'GC-1', balance: 10 })
      onGiftCardApplied({ code: 'GC-1', balance: 10 })
      onGiftCardApplied({ code: 'GC-2', balance: 5 })
      onGiftCardApplied({ code: 'GC-3', balance: 1 })
      onGiftCardRemoved('GC-3')
      // Asked for with the codes it settles, so the summary shows Django's figure.
      expect(q.request!().giftCardCodes).toEqual(['GC-1', 'GC-2'])

      await onSubmit()

      expect(orderBodies()[0].giftCardCodes).toEqual(['GC-1', 'GC-2'])
    })

    it('leaves an order the gift cards only partly cover to be paid for the rest', async () => {
      api.routes({ '/api/orders': orderCreated({ uuid: 'order-part', paymentStatus: 'PENDING' }) })
      const { onSubmit, onGiftCardApplied, createdOrder } = setup(STRIPE)
      onGiftCardApplied({ code: 'GC-1', balance: 10 })

      await onSubmit()

      expect(createdOrder.value).toMatchObject({ uuid: 'order-part' })
      expect(lastToast()).toMatchObject({ title: t('order_created_payment_required') })
      expect(cart.cart).not.toBeNull()
      expect(m.navigateTo).not.toHaveBeenCalled()
    })

    it('finishes like an offline order when the deductions cover everything and Django settled it', async () => {
      api.routes({ '/api/orders': orderCreated({ uuid: 'order-free', paymentStatus: 'COMPLETED' }) })
      const { onSubmit } = setup(STRIPE)

      await onSubmit()

      expect(orderBodies()).toHaveLength(1)
      // Once: `cleanCartState()` clears the server-side cart itself.
      expect(api.callsTo('/api/cart/clear-session')).toEqual([{ url: '/api/cart/clear-session', options: { method: 'POST' } }])
      expect(cart.cart).toBeNull()
      expect(m.sessionFetch).toHaveBeenCalled()
      expect(m.navigateTo).toHaveBeenCalledWith({ name: 'checkout-success' })
      expect(readCheckoutArrival()).toEqual({ orderUuid: 'order-free', placed: true })
      expect(m.toastAdd).not.toHaveBeenCalledWith(expect.objectContaining({ title: t('order_created_payment_required') }))
    })

    it('drops a redemption Django refuses at the order, and says why', async () => {
      api.routes({
        '/api/orders': orderRejected(400, {
          detail: 'Invalid order data',
          error: { type: 'invalid_order_data' },
          code: 'invalid_order_data',
          fieldErrors: { loyaltyPointsToRedeem: ['Not enough points.'] },
        }),
      })
      const { onSubmit, onLoyaltyRedeemed, loyaltyDiscount, createdOrder } = setup(STRIPE)
      onLoyaltyRedeemed({ amount: 5, currency: 'EUR', points: 500 })

      await onSubmit()

      expect(loyaltyDiscount.value).toBeNull()
      expect(createdOrder.value).toBeNull()
      expect(lastFailure()).toMatchObject({
        title: t('form.submit.error.loyalty_redemption_invalid'),
        description: 'Not enough points.',
      })
    })

    it('reports an order request that got no answer, and releases the holds', async () => {
      api.routes({
        '/api/orders': () => {
          throw new TypeError('fetch failed')
        },
      })
      const { onSubmit } = setup(STRIPE)

      await onSubmit()

      expect(lastFailure()).toMatchObject({ title: t('payment_intent_error') })
      expect(m.releaseReservations).toHaveBeenCalledExactlyOnceWith([42])
    })

    it('backToForm releases the holds, resyncs the cart, and a resubmit places a fresh order', async () => {
      api.routes({ '/api/orders': orderCreated(), '/api/cart': null })
      const { onSubmit, backToForm, currentStep, createdOrder } = setup(STRIPE)
      await onSubmit()
      expect(m.releaseReservations).not.toHaveBeenCalled()

      await backToForm()

      expect(m.releaseReservations).toHaveBeenCalledWith([42])
      expect(api.callsTo('/api/cart')).toHaveLength(1)
      expect(createdOrder.value).toBeNull()
      expect(currentStep.value).toBe(2)
    })
  })

  describe('Viva Wallet', () => {
    it('posts the order under an Idempotency-Key and asks for payment', async () => {
      api.routes({ '/api/orders': orderCreated({ uuid: 'order-viva' }) })
      const { onSubmit, createdOrder } = setup(VIVA)

      await onSubmit()

      expect(api.callsTo('/api/orders')[0]!.options.headers['Idempotency-Key']).toBe('0000-idem-key')
      expect(createdOrder.value).toEqual({ uuid: 'order-viva' })
      expect(lastToast()).toMatchObject({ title: t('order_created_payment_required') })
    })

    it('remembers in this browser an order left to be paid on the provider\'s page', async () => {
      const order = makeOrder({ id: 9, isOnlinePayment: true, paymentHoldExpiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() })
      api.routes({ '/api/orders': orderCreated(order) })
      const { onSubmit } = setup(VIVA)

      await onSubmit()
      await nextTick()

      expect(readAwaitingPaymentOrder()).toBe(order.uuid)
    })

    it('releases the holds when the order request itself fails', async () => {
      api.routes({
        '/api/orders': () => {
          throw new TypeError('fetch failed')
        },
      })
      const { onSubmit } = setup(VIVA)

      await onSubmit()

      expect(lastFailure()).toMatchObject({ title: t('payment_intent_error') })
      expect(m.releaseReservations).toHaveBeenCalledExactlyOnceWith([42])
    })
  })

  describe('isOnlinePayment', () => {
    it.each([
      ['online', true],
      ['courier_cash', false],
      ['carrier_terminal', false],
      ['offline_transfer', false],
    ] as const)('follows the pay way settlement: %s -> %s', (settlement, expected) => {
      const { isOnlinePayment } = setup(makePayWay({ id: 1, settlement }))

      expect(isOnlinePayment.value).toBe(expected)
    })

    // The flag the template reads and the flow onSubmit runs come from
    // the same settlement: an online order stays on the page awaiting
    // payment, an offline one lands on the success page.
    it.each([
      ['stripe', 'online', true],
      ['viva_wallet', 'online', true],
      ['cash_on_delivery', 'courier_cash', false],
      ['boxnow', 'carrier_terminal', false],
      ['bank_transfer', 'offline_transfer', false],
      ['stripe', 'offline_transfer', false],
      ['viva_wallet', 'courier_cash', false],
    ] as const)('runs the flow its flag names: %s / %s', async (providerCode, settlement, online) => {
      api.routes({ '/api/orders': orderCreated({ uuid: 'order-x' }) })
      const { onSubmit, isOnlinePayment, createdOrder } = setup(makePayWay({ id: 1, providerCode, settlement }))

      await onSubmit()

      // Online flows leave the order on the page awaiting payment;
      // offline ones navigate to the success page.
      expect(isOnlinePayment.value).toBe(online)
      expect(createdOrder.value !== null && m.navigateTo.mock.calls.length === 0).toBe(online)
    })

    it('refuses an online pay way whose provider has no checkout flow, ordering nothing', async () => {
      api.routes({ '/api/orders': orderCreated() })
      const { onSubmit } = setup(makePayWay({ id: 1, providerCode: 'future_psp', settlement: 'online' }))

      await onSubmit()

      expect(api.callsTo('/api/orders')).toEqual([])
      expect(lastFailure()).toMatchObject({ title: t('form.submit.error.general') })
    })
  })

  describe('offline (cash on delivery)', () => {
    it('posts the order, clears the cart, and lands on the success page marked as placed', async () => {
      api.routes({ '/api/orders': orderCreated({ uuid: 'order-cod' }) })
      const { onSubmit } = setup(COD)

      await onSubmit()

      expect(api.callsTo('/api/orders')[0]!.options.headers['Idempotency-Key']).toBe('0000-idem-key')
      expect(api.callsTo('/api/cart/clear-session')).toEqual([{ url: '/api/cart/clear-session', options: { method: 'POST' } }])
      expect(cart.cart).toBeNull()
      expect(m.sessionFetch).toHaveBeenCalled()
      // ``placed=1`` gates the success page's purchase pixels and cart
      // cleanup; offline pay-ways have no provider redirect param.
      expect(m.navigateTo).toHaveBeenCalledWith({ name: 'checkout-success' })
      expect(readCheckoutArrival()).toEqual({ orderUuid: 'order-cod', placed: true })
      expect(m.releaseReservations).not.toHaveBeenCalled()
      // The success page is the confirmation: no toast beside it.
      expect(m.toastAdd).not.toHaveBeenCalled()
    })

    it('remembers no order that waits for no online payment', async () => {
      api.routes({ '/api/orders': orderCreated(makeOrder({ id: 9 })) })
      const { onSubmit } = setup(COD)

      await onSubmit()
      await nextTick()

      expect(readAwaitingPaymentOrder()).toBeNull()
    })

    it('clears the failure of the last attempt when a new one starts', async () => {
      api.routes({ '/api/orders': orderCreated({ uuid: 'order-cod' }) })
      const { onSubmit, submitError } = setup(COD)
      submitError.value = { title: 'Η προηγούμενη προσπάθεια απέτυχε', description: 'x', fieldErrors: [], serverFault: false }

      await onSubmit()

      expect(submitError.value).toBeNull()
    })

    // The request got no answer: no hook runs, so the catch must say it,
    // or «Place order» does nothing and the shopper is left guessing.
    it('tells the shopper the order was not placed when the request got no answer', async () => {
      api.routes({
        '/api/orders': () => {
          throw new TypeError('fetch failed')
        },
      })
      const { onSubmit } = setup(COD)

      await onSubmit()

      expect(lastFailure()).toMatchObject({ title: t('form.submit.error.general') })
      expect(m.navigateTo).not.toHaveBeenCalled()
      expect(cart.cart).not.toBeNull()
    })

    it('stays put when the created order has no uuid to land on', async () => {
      api.routes({ '/api/orders': orderCreated({}) })
      const { onSubmit } = setup(COD)

      await onSubmit()

      expect(cart.cart).toBeNull()
      expect(m.navigateTo).not.toHaveBeenCalled()
    })

    it('sends the landing attribution captured in this tab', async () => {
      const attribution = { utmSource: 'ig', utmMedium: 'social', clickIds: ['fbclid'], landingPath: '/products/42' }
      window.sessionStorage.setItem('order-attribution', JSON.stringify(attribution))
      api.routes({ '/api/orders': orderCreated() })

      await setup(COD).onSubmit()

      expect(orderBodies()[0].attribution).toEqual(attribution)
    })
  })

  describe('saving the delivery address', () => {
    const saving = (addressTitle: string) => makeFormState({
      saveAddress: true,
      addressTitle,
      country: 'GR',
      region: 'ATT',
      zipcode: ' 105  63 ',
    })

    it('saves the address under its title once the order is placed', async () => {
      api.routes({ '/api/orders': orderCreated() })

      await setup(COD, { formState: saving('  Home  ') }).onSubmit()

      await vi.waitFor(() => expect(m.toastAdd).toHaveBeenCalledWith(expect.objectContaining({
        title: t('form.submit.address_saved_title'),
        color: 'success',
      })))
      expect(api.callsTo('/api/user/addresses')[0]!.options).toMatchObject({
        method: 'POST',
        body: {
          title: 'Home',
          firstName: 'Test',
          lastName: 'User',
          phone: '+306901234567',
          street: 'Main St',
          streetNumber: '1',
          city: 'Athens',
          zipcode: '105 63',
          country: 'GR',
          region: 'ATT',
        },
      })
    })

    // #767: a pickup order is delivered to the point and has none of the
    // shopper's address, so nothing goes to the address book.
    it('saves nothing for a pickup order', async () => {
      api.routes({ '/api/orders': orderCreated() })

      await setup(COD, { formState: Object.assign(saving('Home'), { shippingMethod: 'box_now_locker', boxnowLockerId: '4' }) }).onSubmit()

      await vi.waitFor(() => expect(api.callsTo('/api/orders')).toHaveLength(1))
      expect(api.callsTo('/api/user/addresses')).toEqual([])
    })

    // django-api #769: the address book keeps the line 2 typed at checkout.
    it('saves the address line 2 with it', async () => {
      api.routes({ '/api/orders': orderCreated() })

      await setup(COD, { formState: Object.assign(saving('Home'), { addressLine2: ' 3ος όροφος ' }) }).onSubmit()

      await vi.waitFor(() => expect(api.callsTo('/api/user/addresses')).toHaveLength(1))
      expect(api.callsTo('/api/user/addresses')[0]!.options.body).toMatchObject({ addressLine2: '3ος όροφος' })
    })

    it('tells the shopper the order went through when only the save failed', async () => {
      api.routes({
        '/api/orders': orderCreated({ uuid: 'order-cod' }),
        '/api/user/addresses': () => { throw new Error('500') },
      })

      await setup(COD, { formState: saving('Home') }).onSubmit()

      await vi.waitFor(() => expect(m.toastAdd).toHaveBeenCalledWith(expect.objectContaining({
        title: t('form.submit.address_save_failed_title'),
        color: 'warning',
      })))
      expect(m.navigateTo).toHaveBeenCalled()
    })

    it('saves nothing without a title', async () => {
      api.routes({ '/api/orders': orderCreated() })

      await setup(COD, { formState: saving('   ') }).onSubmit()

      expect(api.callsTo('/api/user/addresses')).toEqual([])
    })
  })

  describe('Meta dedup ids', () => {
    it('sends the ids of every Meta event fired so far, with ad-storage consent', async () => {
      m.consent.value = ['ad_storage']
      api.routes({ '/api/orders': orderCreated() })
      const { onSubmit, fireInitiateCheckout, nextStep } = setup(COD)

      fireInitiateCheckout()
      await nextStep()
      await nextStep()
      await onSubmit()

      expect(orderBodies()[0].meta).toEqual({
        consent: { ads: true },
        event_ids: {
          initiate_checkout: 'initiate-id',
          add_payment_info: 'payment-info-id',
          purchase: 'purchase-id',
        },
      })
    })

    it('sends no ids at all without consent', async () => {
      api.routes({ '/api/orders': orderCreated() })

      await setup(COD).onSubmit()

      expect(orderBodies()[0]).not.toHaveProperty('meta')
      expect(m.meta.newEventId).not.toHaveBeenCalled()
    })
  })

  describe('analytics', () => {
    beforeEach(() => {
      cart.cart = makeCart({
        currency: 'EUR',
        appliedCouponCodes: ['SAVE5', 'VIP'],
        items: [
          { id: 1, quantity: 2, product: { id: 1, price: 50, vatPercent: 0 } },
          { id: 2, quantity: 1, product: { id: 2, price: 30, vatPercent: 0 } },
        ],
      })
    })

    it('fires begin-checkout on every vendor once, however often it is called', () => {
      const { fireInitiateCheckout } = setup(COD)

      fireInitiateCheckout()
      fireInitiateCheckout()

      expect(m.meta.trackInitiateCheckout).toHaveBeenCalledExactlyOnceWith({
        currency: 'EUR',
        value: 130,
        contentType: 'product',
        contentIds: ['1', '2'],
        numItems: 3,
      })
      expect(m.openai.trackCheckoutStarted).toHaveBeenCalledOnce()
      expect(m.tiktok.trackInitiateCheckout).toHaveBeenCalledOnce()
      expect(m.googleAds.trackBeginCheckout).toHaveBeenCalledExactlyOnceWith({ currency: 'EUR', value: 130 })
      expect(m.ga4.trackBeginCheckout).toHaveBeenCalledExactlyOnceWith({
        currency: 'EUR',
        value: 130,
        coupon: 'SAVE5,VIP',
        items: [
          { item_id: '1', quantity: 2, price: 50 },
          { item_id: '2', quantity: 1, price: 30 },
        ],
      })
    })

    it('fires add-payment-info once, on entering the payment step', async () => {
      const { nextStep, prevStep, currentStep } = setup(STRIPE)

      await nextStep()
      expect(m.meta.trackAddPaymentInfo).not.toHaveBeenCalled()

      await nextStep()
      prevStep()
      await nextStep()
      await nextStep()

      expect(currentStep.value).toBe(2)
      expect(m.meta.trackAddPaymentInfo).toHaveBeenCalledOnce()
      expect(m.ga4.trackAddPaymentInfo).toHaveBeenCalledExactlyOnceWith({
        currency: 'EUR',
        value: 130,
        payment_type: 'stripe',
        items: [
          { item_id: '1', quantity: 2, price: 50 },
          { item_id: '2', quantity: 1, price: 30 },
        ],
      })
      expect(m.tiktok.trackAddPaymentInfo).toHaveBeenCalledOnce()
      expect(m.googleAds.trackAddPaymentInfo).toHaveBeenCalledExactlyOnceWith({
        currency: 'EUR',
        value: 130,
      })
    })

    it('never lets a failing pixel block the checkout', async () => {
      m.meta.trackInitiateCheckout.mockImplementation(() => {
        throw new Error('fbq blocked')
      })
      m.meta.trackAddPaymentInfo.mockImplementation(() => {
        throw new Error('fbq blocked')
      })
      const { fireInitiateCheckout, nextStep, currentStep } = setup(COD)

      expect(() => fireInitiateCheckout()).not.toThrow()
      await nextStep()
      await nextStep()
      expect(currentStep.value).toBe(2)
    })
  })

  describe('after the provider refuses the payment', () => {
    it('shows a refused payment and releases the holds', async () => {
      api.routes({ '/api/orders': orderCreated() })
      const { onSubmit, onPaymentError } = setup(STRIPE)
      await onSubmit()

      await onPaymentError('Your card was declined.')

      expect(lastFailure()).toMatchObject({ title: t('payment_failed'), description: 'Your card was declined.' })
      expect(m.releaseReservations).toHaveBeenCalledExactlyOnceWith([42])
      expect(cart.cart).not.toBeNull()
    })
  })

  describe('guards', () => {
    it('ignores a second submit while the first is in flight', async () => {
      let resolveReserve!: (ids: number[]) => void
      m.reserveStock.mockImplementationOnce(() => new Promise((resolve) => {
        resolveReserve = resolve
      }))
      api.routes({ '/api/orders': orderCreated() })
      const { onSubmit, isSubmitting } = setup(COD)

      const first = onSubmit()
      expect(isSubmitting.value).toBe(true)
      await onSubmit()
      expect(m.reserveStock).toHaveBeenCalledOnce()

      resolveReserve([42])
      await first
      expect(isSubmitting.value).toBe(false)
      expect(orderBodies()).toHaveLength(1)
    })

    it('stops at a missing cart before reserving anything', async () => {
      cart.cart = null
      const { onSubmit } = setup(COD)

      await onSubmit()

      expect(m.reserveStock).not.toHaveBeenCalled()
      expect(lastFailure()).toMatchObject({
        title: t('form.submit.error.stock_reservation'),
        description: t('form.submit.error.stock_reservation_description'),
      })
      expect(orderBodies()).toEqual([])
    })

    it('shows the lines that could not be held, instead of a toast', async () => {
      const failedItems = [{ productId: 1, productName: 'Shirt', available: 0, requested: 1 }]
      m.reserveStock.mockRejectedValue(Object.assign(new Error('Insufficient stock'), { code: 'insufficient_stock', failedItems }))
      const { onSubmit, stockError } = setup(COD)

      await onSubmit()

      expect(stockError.value).toEqual({ show: true, failedItems })
      expect(m.toastAdd).not.toHaveBeenCalled()
      expect(orderBodies()).toEqual([])
    })

    it('reports any other reservation failure', async () => {
      m.reserveStock.mockRejectedValue(new Error('503'))
      const { onSubmit, stockError } = setup(COD)

      await onSubmit()

      expect(stockError.value).toBeNull()
      expect(lastFailure()).toMatchObject({ title: t('form.submit.error.stock_reservation') })
    })

    it('goes back to the shipping step when the shipping price cannot be confirmed', async () => {
      const { onSubmit, currentStep } = setup(COD, { refetchShippingOptions: () => Promise.resolve(false) })
      currentStep.value = 2

      await onSubmit()

      expect(currentStep.value).toBe(1)
      expect(lastFailure()).toMatchObject({ title: t('form.submit.error.shipping_unavailable') })
      expect(orderBodies()).toEqual([])
      // No order will follow: the holds are let go.
      expect(m.releaseReservations).toHaveBeenCalledExactlyOnceWith([42])
    })

    it('says the cart is too heavy when no method can carry it, not that shipping is unavailable', async () => {
      const overWeight = { cartWeight: '12,5 κιλά', maxWeight: '10 κιλά' }
      const { onSubmit, currentStep } = setup(COD, {
        refetchShippingOptions: () => Promise.resolve(false),
        shippingOverWeight: ref(overWeight),
      })
      currentStep.value = 2

      await onSubmit()

      expect(currentStep.value).toBe(1)
      expect(lastFailure()).toMatchObject({
        title: t('form.submit.error.shipping_over_weight'),
        description: useNuxtApp().$i18n.t('shipping.method.over_weight_description', overWeight),
      })
      expect(orderBodies()).toEqual([])
    })

    /**
     * Mount the composable in a component, so leaving checkout is an
     * unmount. A mounted component injects the app's own Pinia, not the
     * test's, so the cart goes on that store.
     */
    async function mountCheckout() {
      let submit!: ReturnType<typeof setup>
      const wrapper = await mountSuspended(defineComponent({
        setup: () => {
          useCartStore().cart = makeCart()
          submit = setup(COD)
          return {}
        },
        render: () => null,
      }), { route: false })
      return { wrapper, submit }
    }

    it('releases the holds when the shopper leaves mid-order', async () => {
      let answerOrder!: () => void
      api.routes({
        '/api/orders': () => new Promise((resolve) => {
          answerOrder = () => resolve({})
        }),
      })
      const { wrapper, submit } = await mountCheckout()

      const submitting = submit.onSubmit()
      await vi.waitFor(() => expect(api.callsTo('/api/orders')).toHaveLength(1))
      wrapper.unmount()

      expect(m.releaseReservations).toHaveBeenCalledWith([42])
      answerOrder()
      await submitting
    })

    it('keeps the holds of a placed order when the shopper leaves', async () => {
      api.routes({ '/api/orders': orderCreated() })
      const { wrapper, submit } = await mountCheckout()
      await submit.onSubmit()

      wrapper.unmount()

      expect(m.releaseReservations).not.toHaveBeenCalled()
    })
  })

  describe('the total the order is placed at', () => {
    const NEW_TOTAL = makeCartQuote({ grandTotal: 70, amountDue: 70, expectedTotal: { amount: 7000, currency: 'EUR' } })
    const money = (value: number) => useNuxtApp().$i18n.n(value, 'currency')

    it.each([
      ['cash on delivery', COD],
      ['Viva Wallet', VIVA],
      ['Stripe', STRIPE],
    ])('sends the total and the cart the shopper was shown with a %s order, as the quote stated them', async (_label, payWay) => {
      api.routes({ '/api/orders': orderCreated() })
      const { onSubmit } = setup(payWay)

      await onSubmit()

      expect(orderBodies()[0].expectedTotal).toEqual({ amount: 6300, currency: 'EUR' })
      expect(orderBodies()[0].expectedCartDigest).toBe(CART_DIGEST)
    })

    it('quotes the choices the shopper has reached, and every one on the payment step', () => {
      const { currentStep } = setup(COD)

      const onAddress = q.request!()
      expect(onAddress).not.toHaveProperty('payWayId')
      expect(onAddress).not.toHaveProperty('shippingKind')
      expect(onAddress).not.toHaveProperty('email')

      currentStep.value = 2
      expect(q.request!()).toMatchObject({ payWayId: 1, shippingKind: 'home_delivery', email: 'test@example.com' })
    })

    // The region is picked on the delivery step now (#767): a home
    // delivery is quoted at the one picked there, so the price follows it,
    // and a pickup point, which Django prices without one, sends none.
    it('quotes a home delivery at the region picked on the delivery step, and a pickup with none', () => {
      const formState = makeFormState({ region: 'I', regionId: 'I' })
      const { currentStep } = setup(COD, { formState })
      currentStep.value = 1

      expect(q.request!()).toMatchObject({ regionId: 'I', shippingKind: 'home_delivery' })
      formState.region = 'M'
      formState.regionId = 'M'
      expect(q.request!()).toMatchObject({ regionId: 'M' })
      formState.shippingMethod = 'box_now_locker'
      formState.boxnowLockerId = '4'
      expect(q.request!().regionId).toBeUndefined()
    })

    it('shows a total that changed since the click instead of ordering at it', async () => {
      q.priced = NEW_TOTAL
      const { onSubmit } = setup(COD)

      await onSubmit()

      expect(api.callsTo('/api/orders')).toEqual([])
      expect(lastFailure()).toMatchObject({
        title: t('form.submit.error.total_changed'),
        description: useNuxtApp().$i18n.t('form.submit.error.total_changed_description', { total: money(70) }),
      })
      expect(m.releaseReservations).toHaveBeenCalledWith([42])
    })

    // A line swapped for one at the same price: the total cannot tell, the
    // digest does, and the order is not placed of a cart the page never showed.
    it('shows a cart that changed at the same total since the click instead of ordering it', async () => {
      q.priced = makeCartQuote({ cartDigest: 'digest-of-another-cart' })
      api.routes({ '/api/cart': makeCart() })
      const { onSubmit } = setup(COD)

      await onSubmit()

      expect(api.callsTo('/api/orders')).toEqual([])
      expect(lastFailure()).toMatchObject({
        title: t('form.submit.error.cart_changed'),
        description: useNuxtApp().$i18n.t('form.submit.error.cart_changed_description', { total: money(63) }),
      })
    })

    // The quote names no lines: the cart is asked again with it, so the
    // page shows the lines the next click orders.
    it.each([
      ['a cart that changed at the same total', makeCartQuote({ cartDigest: 'digest-of-another-cart' })],
      ['a total that changed', NEW_TOTAL],
    ])('asks for the cart and the quote again after %s', async (_case, priced) => {
      q.priced = priced
      api.routes({ '/api/cart': makeCart() })
      const { onSubmit } = setup(COD)

      await onSubmit()

      await vi.waitFor(() => expect(api.callsTo('/api/cart')).toHaveLength(1))
      expect(q.refresh).toHaveBeenCalled()
    })

    it('asks for no cart when the quote is the one the shopper accepted', async () => {
      api.routes({ '/api/orders': orderCreated() })
      const { onSubmit } = setup(COD)

      await onSubmit()

      expect(api.callsTo('/api/cart')).toEqual([])
    })

    // A click that lands while the page showed no total (the delivery
    // step's quote prices no pay way; the button waits for one, so only a
    // race gets here) accepted nothing: the total is shown, not ordered at.
    it('orders nothing at a total the page had not shown, and shows it to confirm', async () => {
      q.shown = unpricedQuote()
      api.routes({ '/api/orders': orderCreated() })
      const { onSubmit } = setup(COD)

      await onSubmit()

      expect(api.callsTo('/api/orders')).toEqual([])
      expect(lastFailure()).toMatchObject({
        title: t('form.submit.error.total_confirm'),
        description: useNuxtApp().$i18n.t('form.submit.error.total_confirm_description', { total: money(63) }),
      })
    })

    // The outcome of a request that got no answer is unknown: Django may
    // have made the order. Its retry must reuse the key, so Django answers
    // with that order, even when the quote moved meanwhile.
    it('reuses the key of an order whose outcome is unknown, though the quote changed since', async () => {
      let orders = 0
      api.routes({
        '/api/orders': () => {
          if (orders++ === 0) throw new TypeError('fetch failed')
          return { uuid: 'order-uuid' }
        },
      })
      vi.mocked(crypto.randomUUID)
        .mockReturnValueOnce('0000-idem-key' as `${string}-${string}-${string}-${string}-${string}`)
        .mockReturnValue('1111-idem-key' as `${string}-${string}-${string}-${string}-${string}`)
      const { onSubmit } = setup(COD)
      await onSubmit()

      q.shown = NEW_TOTAL
      q.priced = NEW_TOTAL
      await onSubmit()

      expect(api.callsTo('/api/orders').map(call => call.options.headers['Idempotency-Key']))
        .toEqual(['0000-idem-key', '0000-idem-key'])
      expect(orderBodies().map(body => body.expectedTotal.amount)).toEqual([6300, 7000])
    })

    it('orders at the new total once the shopper submits again with it on the page', async () => {
      q.priced = NEW_TOTAL
      api.routes({ '/api/orders': orderCreated(), '/api/cart': makeCart() })
      const { onSubmit, quotePending } = setup(COD)
      await onSubmit()
      // The page offers the order again once the cart and the quote are back.
      await vi.waitFor(() => expect(quotePending.value).toBe(false))

      q.shown = NEW_TOTAL
      await onSubmit()

      expect(orderBodies().map(body => body.expectedTotal)).toEqual([{ amount: 7000, currency: 'EUR' }])
    })

    it('orders nothing when the total cannot be quoted, and says why', async () => {
      q.priced = null
      q.error = Object.assign(new Error('400'), {
        statusCode: 400,
        data: { detail: 'Ο τρόπος πληρωμής δεν είναι διαθέσιμος.', reason: 'pay_way_unavailable', code: 'pay_way_unavailable' },
      })
      const { onSubmit } = setup(COD)

      await onSubmit()

      expect(api.callsTo('/api/orders')).toEqual([])
      expect(lastFailure()).toMatchObject({
        title: t('form.submit.error.total_unavailable'),
        description: 'Ο τρόπος πληρωμής δεν είναι διαθέσιμος.',
      })
    })

    describe('refused by Django because the cart changed', () => {
      const NEW_CART = makeCartQuote({ cartDigest: 'digest-of-the-cart-now' })
      const cartChanged = orderRejected(409, {
        detail: 'Your cart has changed since its total was shown.',
        code: 'cart_changed',
        error: { type: 'invalid_order_data', quote: makeCheckoutQuote({ cartDigest: 'digest-of-the-cart-now' }) },
      })

      it('says the cart changed, with the amount due now, and asks Django for the cart and the quote again', async () => {
        api.routes({ '/api/orders': cartChanged, '/api/cart': makeCart() })
        const { onSubmit } = setup(COD)

        await onSubmit()
        await vi.waitFor(() => expect(q.refresh).toHaveBeenCalled())

        expect(lastFailure()).toMatchObject({
          title: t('form.submit.error.cart_changed'),
          description: useNuxtApp().$i18n.t('form.submit.error.cart_changed_description', { total: money(63) }),
          code: 'cart_changed',
        })
        expect(api.callsTo('/api/cart')).toHaveLength(1)
      })

      // The quote may come back before the cart's lines do: the order
      // button waits for both, so nothing is ordered of lines not shown.
      it('keeps the order button waiting until the cart is back, though the quote came back first', async () => {
        let reloadCart: (cart: unknown) => void = () => {}
        api.routes({
          '/api/orders': cartChanged,
          '/api/cart': () => new Promise((resolve) => {
            reloadCart = resolve
          }),
        })
        const { onSubmit, quotePending } = setup(COD)

        await onSubmit()
        await vi.waitFor(() => expect(q.refresh).toHaveBeenCalled())

        expect(q.pending).toBe(false)
        expect(quotePending.value).toBe(true)
        reloadCart(makeCart())
        await vi.waitFor(() => expect(quotePending.value).toBe(false))
      })

      // A submit by keyboard while the cart is still on its way: nothing
      // to accept yet, so nothing happens and the shopper keeps the notice.
      // Once the cart is back, the next submit orders the cart now.
      it('ignores a submit before the cart is back, and orders the cart now after it', async () => {
        let orders = 0
        let reloadCart: (cart: unknown) => void = () => {}
        api.routes({
          '/api/orders': () => (orders++ === 0 ? cartChanged : orderCreated())(),
          '/api/cart': () => new Promise((resolve) => {
            reloadCart = resolve
          }),
        })
        const { onSubmit, quotePending } = setup(COD)
        await onSubmit()
        q.shown = NEW_CART
        q.priced = NEW_CART

        await onSubmit()
        expect(orderBodies()).toHaveLength(1)
        expect(lastFailure()?.title).toBe(t('form.submit.error.cart_changed'))

        reloadCart(makeCart())
        await vi.waitFor(() => expect(quotePending.value).toBe(false))
        await onSubmit()

        expect(orderBodies().map(body => body.expectedCartDigest)).toEqual([CART_DIGEST, 'digest-of-the-cart-now'])
      })

      // The cart could not be read again: the page may show lines the
      // quote is not for, so a click asks again instead of ordering, and
      // the click after the cart is back orders.
      it('orders nothing while the cart could not be read again, and reads it on the next click', async () => {
        let orders = 0
        let carts = 0
        api.routes({
          '/api/orders': () => (orders++ === 0 ? cartChanged : orderCreated())(),
          '/api/cart': () => {
            if (carts++ === 0) throw new Error('502')
            return makeCart()
          },
        })
        const { onSubmit, quotePending } = setup(COD)
        await onSubmit()
        await vi.waitFor(() => expect(quotePending.value).toBe(false))
        q.shown = NEW_CART
        q.priced = NEW_CART

        await onSubmit()

        expect(orderBodies()).toHaveLength(1)
        expect(lastFailure()).toMatchObject({
          title: t('form.submit.error.cart_unread'),
          description: t('form.submit.error.cart_unread_description'),
        })
        await vi.waitFor(() => expect(quotePending.value).toBe(false))
        expect(api.callsTo('/api/cart')).toHaveLength(2)

        await onSubmit()

        expect(orderBodies().map(body => body.expectedCartDigest)).toEqual([CART_DIGEST, 'digest-of-the-cart-now'])
      })

      it('orders the cart now once the shopper submits again with its quote on the page', async () => {
        let orders = 0
        api.routes({
          '/api/orders': () => (orders++ === 0 ? cartChanged : orderCreated())(),
          '/api/cart': makeCart(),
        })
        const { onSubmit, quotePending } = setup(COD)
        await onSubmit()
        // The page offers the order again once the cart and the quote are back.
        await vi.waitFor(() => expect(quotePending.value).toBe(false))

        q.shown = NEW_CART
        q.priced = NEW_CART
        await onSubmit()

        expect(orderBodies().map(body => body.expectedCartDigest)).toEqual([CART_DIGEST, 'digest-of-the-cart-now'])
      })
    })

    describe('refused by Django because the total changed', () => {
      const totalChanged = orderRejected(409, {
        detail: 'The order total changed.',
        code: 'total_changed',
        error: { type: 'invalid_order_data', quote: makeCheckoutQuote({ amountDue: 70, expectedTotal: { amount: 7000, currency: 'EUR' } }) },
      })

      it('shows the new total and asks Django for the cart and the quote again', async () => {
        api.routes({ '/api/orders': totalChanged, '/api/cart': makeCart() })
        const { onSubmit } = setup(COD)

        await onSubmit()
        await vi.waitFor(() => expect(q.refresh).toHaveBeenCalled())

        expect(lastFailure()).toMatchObject({
          title: t('form.submit.error.total_changed'),
          description: useNuxtApp().$i18n.t('form.submit.error.total_changed_description', { total: money(70) }),
          code: 'total_changed',
        })
        expect(api.callsTo('/api/cart')).toHaveLength(1)
      })

      // Not after the cart reload: the quote is pending from the refusal
      // on, so the page's button waits instead of offering the old total.
      it('asks for the quote again at once, so the order button waits while the cart still reloads', async () => {
        let reloadCart: (cart: unknown) => void = () => {}
        let answerQuote: () => void = () => {}
        api.routes({
          '/api/orders': totalChanged,
          '/api/cart': () => new Promise((resolve) => {
            reloadCart = resolve
          }),
        })
        q.refresh.mockImplementation(() => {
          q.pending = true
          return new Promise<void>((resolve) => {
            answerQuote = () => {
              q.pending = false
              resolve()
            }
          })
        })
        const { onSubmit, quotePending } = setup(COD)

        await onSubmit()

        expect(quotePending.value).toBe(true)
        reloadCart(makeCart())
        answerQuote()
        await vi.waitFor(() => expect(quotePending.value).toBe(false))
      })

      it('places the next order at the revised total', async () => {
        let orders = 0
        api.routes({
          '/api/orders': () => (orders++ === 0 ? totalChanged : orderCreated())(),
          '/api/cart': makeCart(),
        })
        const { onSubmit, quotePending } = setup(STRIPE)
        await onSubmit()
        // The page offers the order again once the cart and the quote are back.
        await vi.waitFor(() => expect(quotePending.value).toBe(false))

        q.shown = NEW_TOTAL
        q.priced = NEW_TOTAL
        await onSubmit()

        expect(orderBodies().at(-1)!.expectedTotal).toEqual({ amount: 7000, currency: 'EUR' })
      })
    })
  })

  describe('a rejected order', () => {
    it('keeps the cart and releases the holds', async () => {
      api.routes({ '/api/orders': orderRejected(422, { error: { type: 'invalid_order_data' }, detail: 'invalid data' }) })
      const { onSubmit, isSubmitting } = setup(COD)

      await onSubmit()

      expect(api.callsTo('/api/cart/clear-session')).toEqual([])
      expect(cart.cart).not.toBeNull()
      expect(lastFailure()).toMatchObject({
        title: t('form.submit.error.invalid_order_data'),
        description: 'invalid data',
      })
      expect(m.releaseReservations).toHaveBeenCalledExactlyOnceWith([42])
      expect(isSubmitting.value).toBe(false)
    })

    it('mints a new idempotency key for the next attempt', async () => {
      api.routes({ '/api/orders': orderRejected(400, { error: { type: 'invalid_coupon' } }) })
      const { onSubmit } = setup(STRIPE)
      await onSubmit()

      vi.mocked(crypto.randomUUID).mockReturnValue('1111-idem-key' as `${string}-${string}-${string}-${string}-${string}`)
      await onSubmit()

      expect(api.callsTo('/api/orders').map(call => call.options.headers['Idempotency-Key']))
        .toEqual(['0000-idem-key', '1111-idem-key'])
    })

    it('classifies a stock shortfall by error.type, whatever language the message is in', async () => {
      const message = 'Το προϊόν \'Shirt\' έχει ανεπαρκές απόθεμα. Διαθέσιμο: 1, Ζητήθηκε: 3'
      api.routes({ '/api/orders': orderRejected(400, { cart: [message], error: { type: 'insufficient_stock' } }) })

      await setup(COD).onSubmit()

      expect(lastFailure()).toMatchObject({ title: t('form.submit.error.insufficient_stock'), description: message })
    })

    it('sends the shopper back to the first step with a refused field, each under its input', async () => {
      api.routes({
        '/api/orders': orderRejected(400, {
          zipcode: ['Enter a valid postcode, e.g. 151 24.'],
          countryId: ['Select a valid country.'],
        }),
      })
      const { onSubmit, currentStep, stepErrors, nextStep } = setup(COD)
      currentStep.value = 2

      await onSubmit()

      expect(currentStep.value).toBe(0)
      expect(stepErrors.value).toEqual({
        0: [{ name: 'country', message: 'Select a valid country.' }],
        1: [{ name: 'zipcode', message: 'Enter a valid postcode, e.g. 151 24.' }],
      })
      expect(lastFailure().description).toContain('Enter a valid postcode, e.g. 151 24.')

      // Passing each step again answers its own errors, and only those.
      await nextStep()
      expect(stepErrors.value).toEqual({ 1: [{ name: 'zipcode', message: 'Enter a valid postcode, e.g. 151 24.' }] })
      await nextStep()
      expect(stepErrors.value).toEqual({})
    })

    // #767: Django refuses a pickup point on the carrier's own field.
    it('sends a refused pickup point back to the delivery step, under the picker', async () => {
      const message = 'This pickup point is not available.'
      api.routes({
        '/api/orders': orderRejected(400, {
          boxnowLockerId: [message],
          code: 'pickup_point_unknown',
          fields: { boxnowLockerId: [{ message, code: 'pickup_point_unknown' }] },
        }),
      })
      const formState = makeFormState({ shippingMethod: 'box_now_locker', boxnowLockerId: '4', boxnowLocker: { id: '4' } })
      const { onSubmit, currentStep, stepErrors } = setup(COD, { formState })
      currentStep.value = 2

      await onSubmit()

      expect(currentStep.value).toBe(1)
      // The refused locker is dropped: the shopper chooses another.
      expect(formState).toMatchObject({ boxnowLockerId: '', boxnowLocker: null })
      expect(stepErrors.value).toEqual({ 1: [{ name: 'boxnowLockerId', message: t('form.submit.error.pickup_point_unknown') }] })
      expect(lastFailure()).toMatchObject({
        title: t('form.submit.error.pickup_point_refused'),
        description: t('form.submit.error.pickup_point_unknown'),
      })
    })

    // The quote itself refuses the locker (it was picked from a list of
    // another size, or BOX NOW dropped it): no order is ever asked for,
    // so the quote's refusal drops it and says why under the picker.
    it('drops a pickup point the quote refuses and sends the shopper back to choose another', async () => {
      const formState = makeFormState({ shippingMethod: 'box_now_locker', boxnowLockerId: '4', boxnowLocker: { id: '4' } })
      const { currentStep, stepErrors } = setup(COD, { formState })
      currentStep.value = 2

      q.refusalCode = 'pickup_point_too_small'
      await nextTick()

      expect(formState).toMatchObject({ boxnowLockerId: '', boxnowLocker: null })
      expect(currentStep.value).toBe(1)
      expect(stepErrors.value).toEqual({ 1: [{ name: 'boxnowLockerId', message: t('form.submit.error.pickup_point_too_small') }] })
    })

    it('keeps the pickup point when the quote is refused for anything else', async () => {
      const formState = makeFormState({ shippingMethod: 'box_now_locker', boxnowLockerId: '4', boxnowLocker: { id: '4' } })
      const { currentStep, stepErrors } = setup(COD, { formState })
      currentStep.value = 2

      q.refusalCode = 'shipping_unavailable'
      await nextTick()

      expect(formState).toMatchObject({ boxnowLockerId: '4' })
      expect(currentStep.value).toBe(2)
      expect(stepErrors.value).toEqual({})
    })

    it('leaves the step alone for a field no step shows', async () => {
      api.routes({ '/api/orders': orderRejected(400, { meta: ['Not a valid object.'] }) })
      const { onSubmit, currentStep, stepErrors } = setup(COD)
      currentStep.value = 2

      await onSubmit()

      expect(currentStep.value).toBe(2)
      expect(stepErrors.value).toEqual({})
    })

    // The carrier's catalogue could not be asked (503, Retry-After): the
    // order may be placed as it is shortly, so the attempt's key stays and
    // the shopper is told to try again, on the payment step.
    it('tells the shopper to try again when the pickup point could not be checked, under the same key', async () => {
      let orders = 0
      api.routes({
        '/api/orders': () => (orders++ === 0
          ? orderRejected(503, { detail: 'The pickup point cannot be checked right now.', code: 'pickup_point_check_unavailable' })
          : orderCreated())(),
      })
      vi.mocked(crypto.randomUUID)
        .mockReturnValueOnce('0000-idem-key' as `${string}-${string}-${string}-${string}-${string}`)
        .mockReturnValue('1111-idem-key' as `${string}-${string}-${string}-${string}-${string}`)
      const { onSubmit, currentStep } = setup(COD)
      currentStep.value = 2

      await onSubmit()

      expect(currentStep.value).toBe(2)
      expect(lastFailure()).toMatchObject({
        title: t('form.submit.error.pickup_point_check_unavailable'),
        description: t('form.submit.error.pickup_point_check_unavailable_description'),
      })

      await onSubmit()

      expect(api.callsTo('/api/orders').map(call => call.options.headers['Idempotency-Key']))
        .toEqual(['0000-idem-key', '0000-idem-key'])
    })
  })

  /**
   * One key per checkout attempt, so a retried submit can never create a
   * second order. Django replays the first outcome for a repeated key —
   * including a cached 4xx — so the key is kept while the outcome is
   * unknown and replaced once it is final or the inputs change.
   */
  describe('the idempotency key of an attempt', () => {
    type Uuid = `${string}-${string}-${string}-${string}-${string}`
    const mintKeys = (...keys: string[]) => {
      const spy = vi.mocked(crypto.randomUUID)
      for (const key of keys) spy.mockReturnValueOnce(key as Uuid)
    }
    const orderKeys = () => api.callsTo('/api/orders').map(call => call.options.headers['Idempotency-Key'])
    const droppedConnection = () => {
      throw new TypeError('fetch failed')
    }
    /** Answers the n-th order request with the n-th step, then keeps repeating the last. */
    const inSequence = (...steps: Array<(url: string, opts: any) => unknown>) => {
      let calls = 0
      return (url: string, opts: any) => steps[Math.min(calls++, steps.length - 1)]!(url, opts)
    }

    beforeEach(() => {
      mintKeys('0000-idem-key', '1111-idem-key', '2222-idem-key')
    })

    it.each([
      ['a dropped connection', droppedConnection],
      ['a server error', orderRejected(503, { detail: 'Service unavailable.' })],
      ['a duplicate still being processed', orderRejected(409, { detail: 'A duplicate request is already in progress.', code: 'idempotency_in_flight' })],
    ])('is reused when the submit ends in %s, because the order may exist', async (_outcome, failure) => {
      api.routes({ '/api/orders': inSequence(failure, orderCreated()) })
      const { onSubmit } = setup(COD)

      await onSubmit()
      await onSubmit()

      expect(orderKeys()).toEqual(['0000-idem-key', '0000-idem-key'])
    })

    it('is replaced once Django has rejected the order, which it would otherwise replay', async () => {
      api.routes({ '/api/orders': inSequence(orderRejected(422, { detail: 'invalid data' }), orderCreated()) })
      const { onSubmit } = setup(COD)

      await onSubmit()
      await onSubmit()

      expect(orderKeys()).toEqual(['0000-idem-key', '1111-idem-key'])
    })

    it('is replaced when the cart changed between the submits', async () => {
      api.routes({ '/api/orders': inSequence(droppedConnection, orderCreated()) })
      const { onSubmit } = setup(COD)
      await onSubmit()

      const [line, ...rest] = cart.cart!.items
      cart.cart = { ...cart.cart!, items: [{ ...line!, quantity: 99 }, ...rest] }
      await onSubmit()

      expect(orderKeys()).toEqual(['0000-idem-key', '1111-idem-key'])
    })

    it('is replaced when the shopper changed the order between the submits', async () => {
      api.routes({ '/api/orders': inSequence(droppedConnection, orderCreated()) })
      const formState = makeFormState()
      const { onSubmit } = setup(COD, { formState })
      await onSubmit()

      formState.email = 'other@example.com'
      await onSubmit()

      expect(orderKeys()).toEqual(['0000-idem-key', '1111-idem-key'])
    })

    it('is kept although every submit mints a fresh Meta Purchase id', async () => {
      m.consent.value = ['ad_storage']
      m.meta.newEventId.mockReturnValueOnce('purchase-1').mockReturnValueOnce('purchase-2')
      api.routes({ '/api/orders': inSequence(droppedConnection, orderCreated()) })
      const { onSubmit } = setup(COD)

      await onSubmit()
      await onSubmit()

      expect(orderBodies().map(body => body.meta.event_ids.purchase)).toEqual(['purchase-1', 'purchase-2'])
      expect(orderKeys()).toEqual(['0000-idem-key', '0000-idem-key'])
    })

    it('is dropped once the order is placed, so the next checkout starts a new attempt', async () => {
      api.routes({ '/api/orders': orderCreated() })
      const { onSubmit } = setup(VIVA)

      await onSubmit()
      await onSubmit()

      expect(orderKeys()).toEqual(['0000-idem-key', '1111-idem-key'])
    })
  })

  /**
   * The path that shipped broken and was fixed in 59355197: a retryable
   * order error (an expired stock hold) schedules an automatic
   * re-submit 500 ms later, and the isSubmitting guard must not
   * deadlock against it.
   */
  describe('retry', () => {
    const EXPIRED_HOLD = { error: { type: 'reservation_unavailable' }, detail: 'Η δέσμευση αποθέματος δεν ισχύει πλέον.' }

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    })

    function rejectFirst(attempts: number) {
      let calls = 0
      api.routes({
        '/api/orders': () => {
          calls++
          return calls <= attempts
            ? orderRejected(400, EXPIRED_HOLD)()
            : orderCreated({ uuid: 'order-after-retry' })()
        },
      })
    }

    it('re-enters after the delay with fresh holds and a new key, and releases the guard', async () => {
      rejectFirst(1)
      // Django caches the refusal under the first key and would replay
      // it, so the retry has to come under another.
      vi.mocked(crypto.randomUUID)
        .mockReturnValueOnce('0000-idem-key' as `${string}-${string}-${string}-${string}-${string}`)
        .mockReturnValue('1111-idem-key' as `${string}-${string}-${string}-${string}-${string}`)
      const { onSubmit, isSubmitting, createdOrder } = setup(STRIPE)

      await onSubmit()
      // The guard stays up through the retry window so a double-click
      // cannot race the timer.
      expect(isSubmitting.value).toBe(true)
      expect(api.callsTo('/api/orders')).toHaveLength(1)

      await vi.advanceTimersByTimeAsync(499)
      expect(api.callsTo('/api/orders')).toHaveLength(1)
      await vi.advanceTimersByTimeAsync(1)
      await vi.waitFor(() => expect(isSubmitting.value).toBe(false))

      expect(createdOrder.value).toEqual({ uuid: 'order-after-retry' })
      // The dead holds were dropped, so the retry reserved again.
      expect(m.reserveStock).toHaveBeenCalledTimes(2)
      expect(api.callsTo('/api/orders').map(call => call.options.headers['Idempotency-Key']))
        .toEqual(['0000-idem-key', '1111-idem-key'])
      expect(lastToast().title).toBe(t('order_created_payment_required'))
    })

    // The retry has no click of its own: it may only order at the total
    // the click that started it accepted.
    it('never retries at a total the quote reached since without a click', async () => {
      rejectFirst(1)
      const { onSubmit, isSubmitting } = setup(COD)

      await onSubmit()
      const moved = makeCartQuote({ amountDue: 70, expectedTotal: { amount: 7000, currency: 'EUR' } })
      q.shown = moved
      q.priced = moved
      await vi.advanceTimersByTimeAsync(500)
      await vi.waitFor(() => expect(isSubmitting.value).toBe(false))

      expect(api.callsTo('/api/orders')).toHaveLength(1)
      expect(lastFailure().title).toBe(t('form.submit.error.total_changed'))
    })

    it('retries at the accepted total while the quote still has it', async () => {
      rejectFirst(1)
      const { onSubmit, createdOrder, isSubmitting } = setup(COD)

      await onSubmit()
      await vi.advanceTimersByTimeAsync(500)
      await vi.waitFor(() => expect(isSubmitting.value).toBe(false))

      expect(orderBodies().map(body => body.expectedTotal.amount)).toEqual([6300, 6300])
      expect(createdOrder.value).toEqual({ uuid: 'order-after-retry' })
    })

    it('keeps the accepted total when a duplicate click is refused while the order is placed', async () => {
      let refuse!: () => void
      let calls = 0
      api.routes({
        '/api/orders': () => {
          calls++
          if (calls > 1) return orderCreated({ uuid: 'order-after-retry' })()
          return new Promise((_resolve, reject) => {
            refuse = () => {
              try {
                orderRejected(400, EXPIRED_HOLD)()
              }
              catch (error) {
                reject(error)
              }
            }
          })
        },
      })
      const { onSubmit, createdOrder, isSubmitting } = setup(COD)

      const first = onSubmit()
      await vi.waitFor(() => expect(api.callsTo('/api/orders')).toHaveLength(1))
      await onSubmit()
      refuse()
      await first
      await vi.advanceTimersByTimeAsync(500)
      await vi.waitFor(() => expect(isSubmitting.value).toBe(false))

      expect(orderBodies().map(body => body.expectedTotal.amount)).toEqual([6300, 6300])
      expect(createdOrder.value).toEqual({ uuid: 'order-after-retry' })
    })

    it('gives up after three retries, says so, and leaves the CTA usable', async () => {
      rejectFirst(Infinity)
      const { onSubmit, isSubmitting } = setup(STRIPE)

      await onSubmit()
      await vi.runAllTimersAsync()
      await vi.waitFor(() => expect(isSubmitting.value).toBe(false))

      expect(api.callsTo('/api/orders')).toHaveLength(4)
      expect(vi.getTimerCount()).toBe(0)
      expect(lastFailure()).toMatchObject({
        title: t('form.submit.error.general'),
        description: t('form.submit.error.max_retries'),
      })

      // A fresh submit gets a fresh retry budget: its expired hold is
      // retried, not answered with "too many retries".
      rejectFirst(1)
      await onSubmit()
      await vi.runAllTimersAsync()
      await vi.waitFor(() => expect(isSubmitting.value).toBe(false))
      expect(api.callsTo('/api/orders')).toHaveLength(6)
    })

    it('lets a manual submit in the retry window supersede the timer instead of double-submitting', async () => {
      rejectFirst(1)
      const { onSubmit, isSubmitting } = setup(STRIPE)

      await onSubmit()
      expect(isSubmitting.value).toBe(true)

      // Cancelling the timer without dropping the guard it held was the
      // deadlock back through the manual-click door.
      await onSubmit()
      expect(api.callsTo('/api/orders')).toHaveLength(2)
      expect(isSubmitting.value).toBe(false)

      // The cancelled timer never fires a third, zombie submit.
      expect(vi.getTimerCount()).toBe(0)
      await vi.advanceTimersByTimeAsync(1000)
      expect(api.callsTo('/api/orders')).toHaveLength(2)
    })
  })
})
