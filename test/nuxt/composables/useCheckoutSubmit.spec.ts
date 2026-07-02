/**
 * Tests for useCheckoutSubmit composable.
 *
 * TESTABILITY NOTES:
 * - useCheckoutSubmit has no injectable payment-provider seam: the Stripe vs
 *   Viva vs COD branch is driven purely by selectedPayWay.value.providerCode.
 * - createPaymentIntentFromCart is delegated to useCheckout(), which is a Nuxt
 *   auto-import. We mock it via mockNuxtImport so the composable's import
 *   binding is replaced at load time (vi.stubGlobal does not work for Nuxt
 *   auto-imports that are resolved via Vite virtual modules at build time).
 * - The idempotency key is generated with crypto.randomUUID() — we stub it to
 *   get a deterministic value.
 * - useCartStore, useCheckout, useMetaPixel, useGA4, useCookieControl are all
 *   Nuxt auto-imports and are intercepted via mockNuxtImport.
 * - storeToRefs is a Pinia auto-import, also mocked via mockNuxtImport.
 * - UNTESTABLE without a real backend: idempotency dedup behaviour server-side
 *   (whether two requests with the same key actually dedup at Django).
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

// ── Hoist mocks so they are available inside mockNuxtImport factories ──────
const {
  mockReserveStock,
  mockReleaseReservations,
  mockCreatePaymentIntentFromCart,
  mockCleanCartState,
  mockNavigateTo,
  mockMetaPixelImpl,
  mockTikTokPixelImpl,
  mockGA4Impl,
} = vi.hoisted(() => ({
  mockReserveStock: vi.fn(),
  mockReleaseReservations: vi.fn(),
  mockCreatePaymentIntentFromCart: vi.fn(),
  mockCleanCartState: vi.fn().mockResolvedValue(undefined),
  mockNavigateTo: vi.fn().mockResolvedValue(undefined),
  mockMetaPixelImpl: {
    newEventId: vi.fn().mockReturnValue('pixel-event-id'),
    trackInitiateCheckout: vi.fn().mockReturnValue('pixel-event-id'),
    trackAddPaymentInfo: vi.fn().mockReturnValue('pixel-event-id'),
  },
  mockTikTokPixelImpl: {
    trackInitiateCheckout: vi.fn(),
    trackAddPaymentInfo: vi.fn(),
  },
  mockGA4Impl: {
    trackBeginCheckout: vi.fn(),
    trackAddPaymentInfo: vi.fn(),
    trackLogin: vi.fn(),
  },
}))

// The cart ref must be a real Vue ref so cart.value works inside the composable.
// We create it outside vi.hoisted (hoisted scope can't use Vue APIs) and re-assign
// its value in beforeEach.
// We use a plain object with .value here; mockNuxtImport factory will capture it.
const mockCartHolder = { value: null as any }

// ── Nuxt auto-import mocks ─────────────────────────────────────────────────
mockNuxtImport('useRequestHeaders', () => () => ({}))
mockNuxtImport('useLocalePath', () => () => (route: any) => route)
mockNuxtImport('navigateTo', () => mockNavigateTo)
mockNuxtImport('useUserSession', () => () => ({
  fetch: vi.fn().mockResolvedValue(undefined),
}))

mockNuxtImport('useCheckout', () => () => ({
  reserveStock: mockReserveStock,
  releaseReservations: mockReleaseReservations,
  createPaymentIntentFromCart: mockCreatePaymentIntentFromCart,
  getPaymentStatus: vi.fn(),
  pollPaymentStatus: vi.fn(),
  streamPaymentStatus: vi.fn(),
  retryPayment: vi.fn(),
}))

mockNuxtImport('useCartStore', () => () => ({
  cleanCartState: mockCleanCartState,
  cart: mockCartHolder.value,
}))

mockNuxtImport('storeToRefs', () => (_store: any) => ({
  cart: mockCartHolder,
}))

mockNuxtImport('useMetaPixel', () => () => mockMetaPixelImpl)
mockNuxtImport('useTikTokPixel', () => () => mockTikTokPixelImpl)
mockNuxtImport('useGA4', () => () => mockGA4Impl)
mockNuxtImport('useCookieControl', () => () => ({
  cookiesEnabledIds: { value: [] },
}))

// ── $fetch stub — in beforeAll so Nuxt init first runs with real $fetch ────
const mockFetch = vi.fn()

beforeAll(() => {
  vi.stubGlobal('$fetch', mockFetch)
  vi.stubGlobal('log', {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })
  // Mirrors ``shared/shipping/index.ts::carrierForMethod`` — home
  // delivery is intentionally provider-agnostic in checkout, so this
  // helper returns null for that path. Pickup-point methods get a
  // real carrier code. The PI body must agree with the order-create
  // body about this, so the test stubs both honestly.
  vi.stubGlobal('carrierForMethod', (method: string) => {
    if (method === 'box_now_locker') return { code: 'boxnow' }
    if (method === 'acs_smartpoint') return { code: 'acs' }
    return null
  })
  vi.stubGlobal('normalizeGreekPhone', (phone: string) => phone)
})

afterAll(() => {
  vi.unstubAllGlobals()
})

// ── helpers ────────────────────────────────────────────────────────────────

function makePayWay(providerCode: string): PayWay {
  return {
    id: 1,
    name: 'Test Pay Way',
    active: true,
    providerCode,
    iconName: 'credit-card',
    clientCode: '',
    isOnlinePayment: providerCode !== 'cod',
    sortOrder: 1,
  } as unknown as PayWay
}

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
    phone: '6901234567',
    customerNotes: '',
    documentType: 'RECEIPT',
    billingVatId: '',
    billingCountry: '',
    shippingMethod: 'home_delivery',
    saveAddress: false,
    ...overrides,
  }
}

function makePayWaysRef(payWay: PayWay): Ref<Pagination<PayWay> | null | undefined> {
  return ref({
    count: 1,
    next: null,
    previous: null,
    results: [payWay],
  } as unknown as Pagination<PayWay>)
}

// ── per-test reset ─────────────────────────────────────────────────────────
beforeEach(() => {
  mockFetch.mockReset()
  mockNavigateTo.mockReset()
  mockReserveStock.mockReset()
  // ``releaseReservations`` is called with ``.catch(...)`` from
  // multiple paths in useCheckoutSubmit (Viva success cleanup, the
  // onSubmit finally block, onBeforeUnmount). Default to a resolved
  // Promise so a stray un-stubbed call doesn't TypeError on
  // ``undefined.catch``.
  mockReleaseReservations.mockReset().mockResolvedValue(undefined)
  mockCreatePaymentIntentFromCart.mockReset()
  mockCleanCartState.mockReset().mockResolvedValue(undefined)
  mockCartHolder.value = { uuid: 'cart-uuid', id: 1, items: [], totalItems: 0, totalPrice: 0 }
  mockMetaPixelImpl.newEventId.mockReturnValue('pixel-event-id')
  mockGA4Impl.trackBeginCheckout.mockReset()
})

// ── Tests ──────────────────────────────────────────────────────────────────
describe('useCheckoutSubmit', () => {
  describe('Stripe payment path', () => {
    it('creates payment intent and posts order with Idempotency-Key header', async () => {
      const deterministicUUID = 'test-idem-key-stripe'
      vi.stubGlobal('crypto', {
        randomUUID: vi.fn().mockReturnValue(deterministicUUID),
      })

      const stripePayWay = makePayWay('stripe')
      const selectedPayWay = ref<PayWay | null>(stripePayWay)
      const payWays = makePayWaysRef(stripePayWay)

      // reserve-stock succeeds
      mockReserveStock.mockResolvedValue([42])
      // create-payment-intent succeeds
      mockCreatePaymentIntentFromCart.mockResolvedValue({
        clientSecret: 'sk_secret',
        paymentIntentId: 'pi_abc123',
      })

      // POST /api/orders — capture options to assert header + body
      let orderOpts: any
      mockFetch.mockImplementationOnce((_url: string, opts: any) => {
        orderOpts = opts
        if (opts?.onResponse) {
          opts.onResponse({ response: { ok: true, _data: { uuid: 'order-uuid-stripe' } } })
        }
        return Promise.resolve({ uuid: 'order-uuid-stripe' })
      })

      const { onSubmit } = useCheckoutSubmit({
        formState: makeFormState(),
        selectedPayWay,
        payWays,
      })

      await onSubmit()

      // ``createPaymentIntentFromCart`` is called with the carrier
      // context (so the PI amount uses the same free-shipping
      // threshold the order-create step verifies against) plus the
      // idempotency key. For ``home_delivery`` the provider code is
      // intentionally absent — home delivery is provider-agnostic in
      // checkout and both calc paths fall through to the generic
      // shipping rule, which keeps them in sync.
      expect(mockCreatePaymentIntentFromCart).toHaveBeenCalledWith(
        expect.objectContaining({
          payWayId: 1,
          shippingKind: 'home_delivery',
          shippingProviderCode: undefined,
        }),
        deterministicUUID,
      )

      // Order creation must carry Idempotency-Key and payment intent id
      expect(orderOpts?.headers?.['Idempotency-Key']).toBe(deterministicUUID)
      expect(orderOpts?.body).toMatchObject({ paymentIntentId: 'pi_abc123' })
    })
  })

  describe('Viva Wallet payment path', () => {
    it('posts order without Idempotency-Key header (documented gap: no idempotency for Viva)', async () => {
      // This test intentionally documents the current behavior: the Viva Wallet
      // payment path does NOT forward an Idempotency-Key header. If/when this
      // gap is addressed, update this assertion to expect the header IS present.
      const vivaPayWay = makePayWay('viva_wallet')
      const selectedPayWay = ref<PayWay | null>(vivaPayWay)
      const payWays = makePayWaysRef(vivaPayWay)

      mockReserveStock.mockResolvedValue([42])

      let orderOpts: any
      mockFetch.mockImplementationOnce((_url: string, opts: any) => {
        orderOpts = opts
        if (opts?.onResponse) {
          opts.onResponse({ response: { ok: true, _data: { uuid: 'order-uuid-viva' } } })
        }
        return Promise.resolve({ uuid: 'order-uuid-viva' })
      })

      const { onSubmit } = useCheckoutSubmit({
        formState: makeFormState(),
        selectedPayWay,
        payWays,
      })

      await onSubmit()

      expect(orderOpts).toBeDefined()
      // Document the gap: Viva Wallet currently sends no Idempotency-Key
      expect(orderOpts?.headers?.['Idempotency-Key']).toBeUndefined()
    })
  })

  describe('COD / offline payment path', () => {
    it('posts order, clears cart, and navigates to success page on happy path', async () => {
      const codPayWay = makePayWay('cod')
      const selectedPayWay = ref<PayWay | null>(codPayWay)
      const payWays = makePayWaysRef(codPayWay)

      mockReserveStock.mockResolvedValue([10, 11])

      // POST /api/orders
      mockFetch.mockImplementationOnce((_url: string, opts: any) => {
        if (opts?.onResponse) {
          opts.onResponse({ response: { ok: true, _data: { uuid: 'order-uuid-cod' } } })
        }
        return Promise.resolve({ uuid: 'order-uuid-cod' })
      })
      // /api/cart/clear
      mockFetch.mockResolvedValueOnce(undefined)

      const { onSubmit } = useCheckoutSubmit({
        formState: makeFormState(),
        selectedPayWay,
        payWays,
      })

      await onSubmit()

      // cleanCartState (store action) must have been called
      expect(mockCleanCartState).toHaveBeenCalledOnce()

      // Cart API clear must have been called
      const clearCall = mockFetch.mock.calls.find(c => c[0] === '/api/cart/clear')
      expect(clearCall).toBeDefined()
      expect(clearCall?.[1]).toMatchObject({ method: 'POST' })

      expect(mockNavigateTo).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.stringContaining('checkout-success'),
          // ``placed=1`` is the success page's "arrived via a real
          // checkout" marker for offline pay-ways — it gates the Meta
          // Purchase / GA4 purchase browser events and cart cleanup.
          query: { placed: '1' },
        }),
      )
    })
  })

  describe('double-submission guard', () => {
    it('prevents a second call while the first is in-flight (isSubmitting guard)', async () => {
      const codPayWay = makePayWay('cod')
      const selectedPayWay = ref<PayWay | null>(codPayWay)
      const payWays = makePayWaysRef(codPayWay)

      // Make reserve-stock hang so we can observe isSubmitting mid-flight
      let resolveReserve!: (v: number[]) => void
      mockReserveStock.mockImplementationOnce(() => {
        return new Promise<number[]>((resolve) => {
          resolveReserve = resolve
        })
      })

      const { onSubmit, isSubmitting } = useCheckoutSubmit({
        formState: makeFormState(),
        selectedPayWay,
        payWays,
      })

      // First call — intentionally not awaited
      const firstCall = onSubmit()
      // Yield two microtask turns to let isSubmitting flip take effect
      await Promise.resolve()
      await Promise.resolve()

      expect(isSubmitting.value).toBe(true)

      // Second call must be a no-op (returns immediately)
      await onSubmit()

      // reserve-stock called exactly once despite two onSubmit() invocations
      expect(mockReserveStock).toHaveBeenCalledTimes(1)

      // Resolve the hanging call to clean up
      resolveReserve([])
      mockFetch.mockResolvedValueOnce(undefined)
      await firstCall.catch(() => {})
    })
  })

  describe('error propagation', () => {
    it('errors from /api/orders do not clear the cart', async () => {
      const codPayWay = makePayWay('cod')
      const selectedPayWay = ref<PayWay | null>(codPayWay)
      const payWays = makePayWaysRef(codPayWay)

      // reserve-stock succeeds
      mockReserveStock.mockResolvedValue([5])

      // POST /api/orders — 422 error via onResponseError
      mockFetch.mockImplementationOnce((_url: string, opts: any) => {
        const errResponse = {
          status: 422,
          ok: false,
          _data: { error: { type: 'invalid_order_data' }, detail: 'invalid data' },
        }
        if (opts?.onResponseError) {
          opts.onResponseError({ response: errResponse })
        }
        return Promise.resolve(undefined)
      })

      const { onSubmit } = useCheckoutSubmit({
        formState: makeFormState(),
        selectedPayWay,
        payWays,
      })

      await onSubmit()

      // Cart clear must NOT have been called after an order error
      const clearCall = mockFetch.mock.calls.find(c => c[0] === '/api/cart/clear')
      expect(clearCall).toBeUndefined()

      // cleanCartState must NOT have been called
      expect(mockCleanCartState).not.toHaveBeenCalled()
    })

    it('insufficient_stock from reserve-stock sets typed stockError state', async () => {
      const codPayWay = makePayWay('cod')
      const selectedPayWay = ref<PayWay | null>(codPayWay)
      const payWays = makePayWaysRef(codPayWay)

      // useCheckout.reserveStock re-throws with code + failedItems directly on the error
      const stockErr = new Error('Insufficient stock') as any
      stockErr.code = 'insufficient_stock'
      stockErr.failedItems = [
        { productId: 1, productName: 'Shirt', available: 0, requested: 1 },
      ]
      mockReserveStock.mockRejectedValue(stockErr)

      const { onSubmit, stockError } = useCheckoutSubmit({
        formState: makeFormState(),
        selectedPayWay,
        payWays,
      })

      await onSubmit()

      // The stockError ref must be populated — not just a generic toast
      expect(stockError.value).not.toBeNull()
      expect(stockError.value?.show).toBe(true)
      expect(stockError.value?.failedItems).toHaveLength(1)
      expect(stockError.value?.failedItems[0]?.productId).toBe(1)
    })
  })
})
