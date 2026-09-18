import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'
import CouponPicker from '~/components/variants/webside/Checkout/CouponPicker.vue'

/**
 * The picker's whole value is that its verdicts match what applying the
 * code would actually do. Django computes them; these tests pin the
 * rendering contract — an ineligible row must be DISABLED and say why,
 * and the trigger must never advertise a count the shopper cannot act
 * on.
 */

const PUBLIC_SETTINGS = { settings: { PROMOTIONS_ENABLED: 'true' } }

function offer(over: Record<string, any> = {}) {
  return {
    id: 1,
    name: 'Καλωσόρισμα -10%',
    description: '',
    trigger: 'CODE',
    benefitType: 'PERCENTAGE',
    benefitValue: 10,
    targetScope: 'ORDER',
    code: null,
    minSubtotal: null,
    maxDiscountAmount: null,
    minQuantity: null,
    buyQuantity: null,
    getQuantity: null,
    getDiscountPercent: 100,
    excludeDiscountedProducts: false,
    firstOrderOnly: false,
    stackable: true,
    endsAt: null,
    rewardProducts: [],
    eligibleProducts: [],
    eligibleProductCount: 0,
    eligibleCategories: [],
    ...over,
  }
}

function coupon(over: Record<string, any> = {}) {
  return {
    promotion: offer(over.promotion),
    code: 'SAVE5',
    eligible: true,
    reason: null,
    discountAmount: 5,
    freeShipping: false,
    applied: false,
    ...over,
  }
}

let coupons: any[] = []

// The mock is live during Nuxt BOOTSTRAP too (/api/_auth/session,
// /api/_allauth/app/v1/config, /api/cart). A bare vi.fn() returns
// undefined there, the plugin chain crashes, and @nuxtjs/i18n never
// installs — which surfaces much later as vue-i18n's "Need to install
// with `app.use` function" from this component's own useI18n(). Hence
// the default implementation inside vi.hoisted.
const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn((..._args: any[]) => Promise.resolve({})),
}))
mockNuxtImport('$fetch', () => mockFetch)
registerEndpoint('/api/settings/public', () => PUBLIC_SETTINGS)

const cartRef = ref<any>({
  totalPrice: 100,
  totalItems: 1,
  appliedCouponCodes: [],
})
const mockRefreshCart = vi.fn()

mockNuxtImport('useCartStore', () => {
  return () => ({ cart: cartRef, refreshCart: mockRefreshCart })
})
mockNuxtImport('storeToRefs', () => {
  return (store: any) => ({ cart: store.cart })
})

// ``server: false`` defers the fetch to the client tick after mount, so
// the list lands a beat later than a plain useFetch would.
async function settle(wrapper?: any) {
  await new Promise(resolve => setTimeout(resolve, 250))
  await wrapper?.vm?.$nextTick?.()
}

/**
 * Mount and remember the wrapper so ``afterEach`` can tear it down.
 *
 * A component left mounted keeps its ``useFetch`` watchers alive: the
 * next ``beforeEach`` reassigns the cart ref, that fires a refetch
 * while the fixture list is still empty, and the result lands in the
 * shared ``cart-coupons`` key AFTER the next test has mounted — so
 * every test but the first rendered the previous one's empty list.
 */
let wrapper: any
async function mount() {
  wrapper = await mountSuspended(CouponPicker)
  await settle(wrapper)
  return wrapper
}

describe('CheckoutCouponPicker', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    // useFetch routes through the mocked $fetch auto-import, so the
    // coupons endpoint has to be answered HERE — registerEndpoint alone
    // never sees the call, and a bare {} makes the component's
    // ``rows.filter`` blow up at render.
    mockFetch.mockImplementation((url: any) => {
      if (String(url).includes('/api/cart/coupons')) {
        return Promise.resolve(coupons)
      }
      if (String(url).includes('/api/settings/public')) {
        return Promise.resolve(PUBLIC_SETTINGS)
      }
      return Promise.resolve({})
    })
    mockRefreshCart.mockReset()
    coupons = []
    cartRef.value = { totalPrice: 100, totalItems: 1, appliedCouponCodes: [] }
    // ``useFetch`` caches by key on the Nuxt app, and @nuxt/test-utils
    // reuses ONE app for the whole file — without this every test after
    // the first replays the first one's payload instead of fetching.
    clearNuxtData('cart-coupons')
  })

  afterEach(() => {
    wrapper?.unmount?.()
    wrapper = undefined
  })

  it('renders nothing when the store publishes no coupons', async () => {
    const wrapper = await mount()

    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('counts only the coupons the shopper can actually claim', async () => {
    coupons = [
      coupon({ code: 'SAVE5' }),
      coupon({
        code: 'LOCKED',
        eligible: false,
        reason: 'discount_code_minimum_not_met',
        discountAmount: 0,
      }),
      coupon({ code: 'ONCART', applied: true, discountAmount: 5 }),
    ]

    const wrapper = await mount()

    // One eligible-and-unapplied row out of three.
    expect(wrapper.find('button').text()).toContain('(1)')
  })

  it('drops the number rather than advertising zero claimable coupons', async () => {
    coupons = [
      coupon({
        code: 'LOCKED',
        eligible: false,
        reason: 'discount_code_expired',
        discountAmount: 0,
      }),
    ]

    const wrapper = await mount()

    const label = wrapper.find('button').text()
    expect(label).not.toContain('(0)')
    expect(label.length).toBeGreaterThan(0)
  })

  it('disables an ineligible coupon and explains the refusal', async () => {
    coupons = [
      coupon({
        code: 'LOCKED',
        eligible: false,
        reason: 'discount_code_minimum_not_met',
        discountAmount: 0,
      }),
    ]

    const wrapper = await mount()
    await wrapper.find('button').trigger('click')
    await settle(wrapper)

    const text = document.body.textContent ?? ''
    expect(text).toContain('ελάχιστο ποσό')
    const applyButton = [...document.querySelectorAll('button')].find(
      node => node.textContent?.trim() === 'Εφαρμογή',
    )
    expect(applyButton?.hasAttribute('disabled')).toBe(true)
  })

  it('applies an eligible coupon and refreshes the cart', async () => {
    coupons = [coupon({ code: 'SAVE5' })]

    const wrapper = await mount()
    await wrapper.find('button').trigger('click')
    await settle(wrapper)

    const applyButton = [...document.querySelectorAll('button')].find(
      node => node.textContent?.trim() === 'Εφαρμογή',
    )
    applyButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await settle(wrapper)

    // ``/api/cart/coupons`` (the listing) CONTAINS ``/api/cart/coupon``,
    // so match the apply route exactly.
    const calls = mockFetch.mock.calls.filter(call =>
      String(call[0]).endsWith('/api/cart/coupon'))
    expect(calls).toHaveLength(1)
    expect((calls[0]![1] as any).body).toEqual({ code: 'SAVE5' })
    expect(mockRefreshCart).toHaveBeenCalled()
  })

  it('marks the coupon already on the cart instead of offering it again', async () => {
    coupons = [coupon({ code: 'ONCART', applied: true, discountAmount: 5 })]

    const wrapper = await mount()
    await wrapper.find('button').trigger('click')
    await settle(wrapper)

    const applyButtons = [...document.querySelectorAll('button')].filter(
      node => node.textContent?.trim() === 'Εφαρμογή',
    )
    expect(applyButtons).toHaveLength(0)
    expect(document.body.textContent).toContain('Εφαρμοσμένο')
  })

  it('tells the shopper when an eligible coupon would take nothing off', async () => {
    coupons = [coupon({ code: 'NOOP', discountAmount: 0 })]

    const wrapper = await mount()
    await wrapper.find('button').trigger('click')
    await settle(wrapper)

    expect(document.body.textContent).toContain('Δεν μειώνει το σύνολο')
  })
})
