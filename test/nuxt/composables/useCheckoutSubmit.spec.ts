/**
 * The checkout submit orchestration: stock holds, the payment-provider
 * branch (Stripe intent / Viva / offline), retries, idempotency, and
 * where the shopper lands. What the order body contains and how a
 * rejected order is worded are pure functions with their own unit specs
 * (`test/unit/app/utils/checkoutOrder.spec.ts`,
 * `checkoutAnalytics.spec.ts`); here they run for real inside the flow.
 *
 * `useCheckout` is the HTTP boundary for holds and intents (it has its
 * own spec) and is mocked; `/api/orders` and everything else go through
 * the `$api` mock. The cart is the REAL cart store in a fresh Pinia.
 *
 * Not testable here: whether Django actually dedups two requests that
 * carry the same Idempotency-Key.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { setActivePinia, createPinia } from 'pinia'
import { defineComponent, nextTick } from 'vue'
import { useCartStore } from '~/stores/cart'
import { makeCart } from '~~/test/fixtures/cart'
import { makeCountry } from '~~/test/fixtures/country'
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
  createPaymentIntentFromCart: vi.fn((_request: CartCreatePaymentIntentRequestRequest, _idempotencyKey?: string) =>
    Promise.resolve({ clientSecret: 'cs_1', paymentIntentId: 'pi_1' })),
  consent: { value: [] as string[] },
  meta: {
    newEventId: vi.fn(() => 'purchase-id'),
    trackInitiateCheckout: vi.fn(() => 'initiate-id'),
    trackAddPaymentInfo: vi.fn(() => 'payment-info-id'),
  },
  tiktok: { trackInitiateCheckout: vi.fn(), trackAddPaymentInfo: vi.fn() },
  openai: { trackCheckoutStarted: vi.fn() },
  googleAds: { trackBeginCheckout: vi.fn() },
  ga4: { trackBeginCheckout: vi.fn(), trackAddPaymentInfo: vi.fn() },
}))

mockNuxtImport('useToast', () => () => ({ add: m.toastAdd }))
mockNuxtImport('navigateTo', () => m.navigateTo)
mockNuxtImport('useLocalePath', () => () => (route: unknown) => route)
mockNuxtImport('useUserSession', () => () => ({ fetch: m.sessionFetch }))
mockNuxtImport('useCheckout', () => () => ({
  reserveStock: m.reserveStock,
  releaseReservations: m.releaseReservations,
  createPaymentIntentFromCart: m.createPaymentIntentFromCart,
}))
mockNuxtImport('useCookieControl', () => () => ({ cookiesEnabledIds: m.consent }))
mockNuxtImport('useMetaPixel', () => () => m.meta)
mockNuxtImport('useTikTokPixel', () => () => m.tiktok)
mockNuxtImport('useOpenAIPixel', () => () => m.openai)
mockNuxtImport('useGoogleAds', () => () => m.googleAds)
mockNuxtImport('useGA4', () => () => m.ga4)

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

function setup(payWay: PayWay, options: {
  formState?: Record<string, any>
  selectedCountry?: Country
  refetchShippingOptions?: () => Promise<boolean>
} = {}) {
  return useCheckoutSubmit({
    formState: options.formState ?? makeFormState(),
    selectedPayWay: ref<PayWay | null>(payWay),
    payWays: ref<Pagination<PayWay>>({ count: 1, results: [payWay] }),
    selectedCountry: ref(options.selectedCountry),
    refetchShippingOptions: options.refetchShippingOptions,
  })
}

/** Django accepted the order: ofetch awaits `onResponse` before resolving. */
const orderCreated = (data: Record<string, unknown> = { uuid: 'order-uuid' }) =>
  async (_url: string, opts: any) => {
    await opts.onResponse?.({ response: { ok: true, _data: data } })
    return data
  }

/** Django rejected it: ofetch runs `onResponseError`, then rejects with a FetchError. */
const orderRejected = (status: number, body: unknown) =>
  (_url: string, opts: any) => {
    const response = { ok: false, status, _data: body }
    opts.onResponseError?.({ response })
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
  window.sessionStorage.clear()
  vi.spyOn(crypto, 'randomUUID').mockReturnValue('0000-idem-key' as `${string}-${string}-${string}-${string}-${string}`)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useCheckoutSubmit', () => {
  describe('Stripe', () => {
    it('prices an intent for the chosen shipping, then posts the order under one idempotency key', async () => {
      api.routes({ '/api/orders': orderCreated({ uuid: 'order-stripe' }) })
      const { onSubmit, createdOrder } = setup(STRIPE)

      await onSubmit()

      // Home delivery is provider-agnostic: no provider code on either
      // request, so both price shipping by the same generic rule.
      expect(m.createPaymentIntentFromCart).toHaveBeenCalledWith({
        payWayId: 1,
        shippingKind: 'home_delivery',
        shippingProviderCode: undefined,
        countryId: 1,
        regionId: undefined,
        email: 'test@example.com',
        giftCardCodes: undefined,
        loyaltyPointsToRedeem: undefined,
      }, '0000-idem-key')
      const [order] = api.callsTo('/api/orders')
      expect(order!.options.method).toBe('POST')
      expect(order!.options.headers['Idempotency-Key']).toBe('0000-idem-key')
      expect(order!.options.body).toMatchObject({ paymentIntentId: 'pi_1', shippingKind: 'home_delivery' })
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

    it('redeems the applied gift cards on both the intent and the order, once per code', async () => {
      api.routes({ '/api/orders': orderCreated() })
      const { onSubmit, onGiftCardApplied, onGiftCardRemoved, giftCardBalanceTotal } = setup(STRIPE)

      onGiftCardApplied({ code: 'GC-1', balance: 10 })
      onGiftCardApplied({ code: 'GC-1', balance: 10 })
      onGiftCardApplied({ code: 'GC-2', balance: 5 })
      onGiftCardApplied({ code: 'GC-3', balance: 1 })
      onGiftCardRemoved('GC-3')
      expect(giftCardBalanceTotal.value).toBe(15)

      await onSubmit()

      expect(m.createPaymentIntentFromCart.mock.calls[0]![0]).toMatchObject({ giftCardCodes: ['GC-1', 'GC-2'] })
      expect(orderBodies()[0].giftCardCodes).toEqual(['GC-1', 'GC-2'])
    })

    it.each(['gift_card_covers_total', 'nothing_to_charge'])(
      'orders without an intent when the deductions cover everything (%s), then finishes like an offline order',
      async (reason) => {
        m.createPaymentIntentFromCart.mockRejectedValue(Object.assign(new Error('400'), { data: { reason } }))
        api.routes({ '/api/orders': orderCreated({ uuid: 'order-free' }) })
        const { onSubmit } = setup(STRIPE)

        await onSubmit()

        expect(orderBodies()).toHaveLength(1)
        expect(orderBodies()[0]).not.toHaveProperty('paymentIntentId')
        // Not a count: this path POSTs clear-session itself and again
        // through `cleanCartState()` (reported as a redundant request).
        expect(api.callsTo('/api/cart/clear-session')).toContainEqual({ url: '/api/cart/clear-session', options: { method: 'POST' } })
        expect(cart.cart).toBeNull()
        expect(m.sessionFetch).toHaveBeenCalled()
        expect(m.navigateTo).toHaveBeenCalledWith({
          name: 'checkout-success-uuid',
          params: { uuid: 'order-free' },
          query: { placed: '1' },
        })
        expect(m.toastAdd).not.toHaveBeenCalledWith(expect.objectContaining({ title: t('order_created_payment_required') }))
      },
    )

    it('asks a guest redeeming points to sign in, and orders nothing', async () => {
      m.createPaymentIntentFromCart.mockRejectedValue(
        Object.assign(new Error('400'), { data: { reason: 'loyalty_requires_authentication' } }),
      )
      const { onSubmit } = setup(STRIPE)

      await onSubmit()

      expect(lastToast()).toEqual({ title: t('form.submit.error.loyalty_requires_authentication'), color: 'error' })
      expect(orderBodies()).toEqual([])
    })

    it('drops a redemption the backend no longer honours, and orders nothing', async () => {
      m.createPaymentIntentFromCart.mockRejectedValue(
        Object.assign(new Error('400'), { data: { reason: 'loyalty_redemption_invalid', detail: 'Not enough points.' } }),
      )
      const { onSubmit, onLoyaltyRedeemed, loyaltyDiscount } = setup(STRIPE)
      onLoyaltyRedeemed({ amount: 5, currency: 'EUR', points: 500 })

      await onSubmit()

      expect(loyaltyDiscount.value).toBeNull()
      expect(lastToast()).toEqual({
        title: t('form.submit.error.loyalty_redemption_invalid'),
        description: 'Not enough points.',
        color: 'error',
      })
      expect(orderBodies()).toEqual([])
    })

    it('reports any other intent failure as a payment error, and orders nothing', async () => {
      m.createPaymentIntentFromCart.mockRejectedValue(
        Object.assign(new Error('400'), { data: { reason: 'provider_down', detail: 'Stripe is unavailable.' } }),
      )
      const { onSubmit } = setup(STRIPE)

      await onSubmit()

      expect(lastToast()).toEqual({ title: t('payment_intent_error'), description: 'Stripe is unavailable.', color: 'error' })
      expect(orderBodies()).toEqual([])
    })

    /**
     * An intent is priced at creation. Any change to what is deducted
     * after that makes it stale, and order-create would reject it on
     * the amount — so the next submit must price a new one.
     */
    describe('a deduction change after the intent was priced', () => {
      async function submitOnceWithoutAnOrder() {
        // The order POST fails at the network: the intent survives it.
        api.routes({
          '/api/orders': () => {
            throw new TypeError('fetch failed')
          },
        })
        const submit = setup(STRIPE)
        await submit.onSubmit()
        expect(m.createPaymentIntentFromCart).toHaveBeenCalledOnce()
        api.routes({ '/api/orders': orderCreated() })
        return submit
      }

      it('reuses the intent when nothing changed', async () => {
        const { onSubmit } = await submitOnceWithoutAnOrder()

        await onSubmit()

        expect(m.createPaymentIntentFromCart).toHaveBeenCalledOnce()
        expect(orderBodies().at(-1)).toMatchObject({ paymentIntentId: 'pi_1' })
      })

      it.each([
        ['loyalty points are redeemed', (s: ReturnType<typeof setup>) => s.onLoyaltyRedeemed({ amount: 5, currency: 'EUR', points: 500 })],
        ['a gift card is applied', (s: ReturnType<typeof setup>) => s.onGiftCardApplied({ code: 'GC-1', balance: 10 })],
        ['a coupon is applied', () => { cart.cart = { ...cart.cart!, appliedCouponCodes: ['SAVE5'] } }],
        ['the promotion discount moves', () => { cart.cart = { ...cart.cart!, promotionDiscount: 3 } }],
      ])('prices a fresh intent when %s', async (_case, change) => {
        const submit = await submitOnceWithoutAnOrder()
        m.createPaymentIntentFromCart.mockResolvedValue({ clientSecret: 'cs_2', paymentIntentId: 'pi_2' })

        change(submit)
        await nextTick()
        await submit.onSubmit()

        expect(m.createPaymentIntentFromCart).toHaveBeenCalledTimes(2)
        expect(orderBodies().at(-1)).toMatchObject({ paymentIntentId: 'pi_2' })
      })
    })

    it('backToForm releases the holds, resyncs the cart, and a resubmit mints a FRESH intent', async () => {
      // The resync finds the cart unchanged, so nothing but backToForm
      // itself can drop the intent.
      api.routes({ '/api/orders': orderCreated(), '/api/cart': null })
      const { onSubmit, backToForm, currentStep, createdOrder } = setup(STRIPE)
      await onSubmit()
      expect(m.releaseReservations).not.toHaveBeenCalled()

      await backToForm()

      expect(m.releaseReservations).toHaveBeenCalledWith([42])
      expect(api.callsTo('/api/cart')).toHaveLength(1)
      expect(createdOrder.value).toBeNull()
      expect(currentStep.value).toBe(2)

      // Reusing the intent bound to the abandoned order had produced an
      // orphaned PENDING order.
      m.createPaymentIntentFromCart.mockResolvedValue({ clientSecret: 'cs_2', paymentIntentId: 'pi_2' })
      await onSubmit()
      expect(m.createPaymentIntentFromCart).toHaveBeenCalledTimes(2)
      expect(orderBodies().at(-1)).toMatchObject({ paymentIntentId: 'pi_2' })
    })
  })

  describe('Viva Wallet', () => {
    it('posts the order without an Idempotency-Key (documented gap) and asks for payment', async () => {
      api.routes({ '/api/orders': orderCreated({ uuid: 'order-viva' }) })
      const { onSubmit, createdOrder } = setup(VIVA)

      await onSubmit()

      expect(api.callsTo('/api/orders')[0]!.options.headers['Idempotency-Key']).toBeUndefined()
      expect(createdOrder.value).toEqual({ uuid: 'order-viva' })
      expect(lastToast()).toMatchObject({ title: t('order_created_payment_required') })
    })

    it('releases the holds when the order request itself fails', async () => {
      api.routes({
        '/api/orders': () => {
          throw new TypeError('fetch failed')
        },
      })
      const { onSubmit } = setup(VIVA)

      await onSubmit()

      expect(lastToast()).toMatchObject({ title: t('payment_intent_error'), color: 'error' })
      expect(m.releaseReservations).toHaveBeenCalledExactlyOnceWith([42])
    })
  })

  describe('offline (cash on delivery)', () => {
    it('posts the order, clears the cart, and lands on the success page marked as placed', async () => {
      api.routes({ '/api/orders': orderCreated({ uuid: 'order-cod' }) })
      const { onSubmit } = setup(COD)

      await onSubmit()

      expect(api.callsTo('/api/orders')[0]!.options.headers).not.toHaveProperty('Idempotency-Key')
      expect(api.callsTo('/api/cart/clear-session')[0]!.options).toEqual({ method: 'POST' })
      expect(cart.cart).toBeNull()
      expect(m.sessionFetch).toHaveBeenCalled()
      // ``placed=1`` gates the success page's purchase pixels and cart
      // cleanup; offline pay-ways have no provider redirect param.
      expect(m.navigateTo).toHaveBeenCalledWith({
        name: 'checkout-success-uuid',
        params: { uuid: 'order-cod' },
        query: { placed: '1' },
      })
      expect(m.releaseReservations).not.toHaveBeenCalled()
      // The success page is the confirmation: no toast beside it.
      expect(m.toastAdd).not.toHaveBeenCalled()
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

  describe('after the provider confirms or refuses the payment', () => {
    it('clears the cart and lands on the success page once the payment succeeded', async () => {
      api.routes({ '/api/orders': orderCreated({ uuid: 'order-paid' }) })
      const { onSubmit, onPaymentSuccess } = setup(STRIPE)
      await onSubmit()

      await onPaymentSuccess()

      expect(lastToast()).toMatchObject({ title: t('payment_successful'), color: 'success' })
      expect(cart.cart).toBeNull()
      expect(m.sessionFetch).toHaveBeenCalled()
      expect(m.navigateTo).toHaveBeenCalledWith({ name: 'checkout-success-uuid', params: { uuid: 'order-paid' } })
    })

    it('does nothing on a success with no order behind it', async () => {
      const { onPaymentSuccess } = setup(STRIPE)

      await onPaymentSuccess()

      expect(m.toastAdd).not.toHaveBeenCalled()
      expect(cart.cart).not.toBeNull()
      expect(m.navigateTo).not.toHaveBeenCalled()
    })

    it('shows a refused payment and releases the holds', async () => {
      api.routes({ '/api/orders': orderCreated() })
      const { onSubmit, onPaymentError } = setup(STRIPE)
      await onSubmit()

      await onPaymentError('Your card was declined.')

      expect(lastToast()).toEqual({ title: t('payment_failed'), description: 'Your card was declined.', color: 'error' })
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
      expect(lastToast()).toEqual({
        title: t('form.submit.error.stock_reservation'),
        description: t('form.submit.error.stock_reservation_description'),
        color: 'error',
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
      expect(lastToast()).toMatchObject({ title: t('form.submit.error.stock_reservation'), color: 'error' })
    })

    it('goes back to the shipping step when the shipping price cannot be confirmed', async () => {
      const { onSubmit, currentStep } = setup(COD, { refetchShippingOptions: () => Promise.resolve(false) })
      currentStep.value = 2

      await onSubmit()

      expect(currentStep.value).toBe(1)
      expect(lastToast()).toMatchObject({ title: t('form.submit.error.shipping_unavailable') })
      expect(orderBodies()).toEqual([])
      // No order will follow: the holds are let go.
      expect(m.releaseReservations).toHaveBeenCalledExactlyOnceWith([42])
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

  describe('a rejected order', () => {
    it('keeps the cart and releases the holds', async () => {
      api.routes({ '/api/orders': orderRejected(422, { error: { type: 'invalid_order_data' }, detail: 'invalid data' }) })
      const { onSubmit, isSubmitting } = setup(COD)

      await onSubmit()

      expect(api.callsTo('/api/cart/clear-session')).toEqual([])
      expect(cart.cart).not.toBeNull()
      expect(lastToast()).toEqual({
        title: t('form.submit.error.invalid_order_data'),
        description: 'invalid data',
        color: 'error',
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

      expect(lastToast()).toMatchObject({ title: t('form.submit.error.insufficient_stock'), description: message })
    })

    it('sends the shopper back to the address step, one error per input', async () => {
      api.routes({
        '/api/orders': orderRejected(400, {
          zipcode: ['Enter a valid postcode, e.g. 151 24.'],
          countryId: ['Select a valid country.'],
        }),
      })
      const { onSubmit, currentStep, addressStepErrors, nextStep } = setup(COD)
      currentStep.value = 2

      await onSubmit()

      expect(currentStep.value).toBe(0)
      expect(addressStepErrors.value).toEqual([
        { name: 'zipcode', message: 'Enter a valid postcode, e.g. 151 24.' },
        { name: 'country', message: 'Select a valid country.' },
      ])
      expect(lastToast().description).toContain('Enter a valid postcode, e.g. 151 24.')

      // Passing the address step again answers them.
      await nextStep()
      expect(addressStepErrors.value).toEqual([])
    })

    it('leaves the step alone for a field the address step does not own', async () => {
      api.routes({ '/api/orders': orderRejected(400, { boxnowLockerId: ['Locker ID required.'] }) })
      const { onSubmit, currentStep, addressStepErrors } = setup(COD)
      currentStep.value = 2

      await onSubmit()

      expect(currentStep.value).toBe(2)
      expect(addressStepErrors.value).toEqual([])
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
        '/api/orders': (url: string, opts: any) => {
          calls++
          return calls <= attempts
            ? orderRejected(400, EXPIRED_HOLD)(url, opts)
            : orderCreated({ uuid: 'order-after-retry' })(url, opts)
        },
      })
    }

    it('re-enters after the delay with fresh holds and the same key, and releases the guard', async () => {
      rejectFirst(1)
      // A second key minted by mistake would show up as this one.
      vi.mocked(crypto.randomUUID)
        .mockReturnValueOnce('0000-idem-key' as `${string}-${string}-${string}-${string}-${string}`)
        .mockReturnValue('9999-wrong-key' as `${string}-${string}-${string}-${string}-${string}`)
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
        .toEqual(['0000-idem-key', '0000-idem-key'])
      expect(lastToast().title).toBe(t('order_created_payment_required'))
    })

    it('gives up after three retries, says so, and leaves the CTA usable', async () => {
      rejectFirst(Infinity)
      const { onSubmit, isSubmitting } = setup(STRIPE)

      await onSubmit()
      await vi.runAllTimersAsync()
      await vi.waitFor(() => expect(isSubmitting.value).toBe(false))

      expect(api.callsTo('/api/orders')).toHaveLength(4)
      expect(vi.getTimerCount()).toBe(0)
      expect(lastToast()).toEqual({
        title: t('form.submit.error.general'),
        description: t('form.submit.error.max_retries'),
        color: 'error',
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
