import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'
import CouponInput from '~/components/Checkout/CouponInput.vue'

// useFetch routes through the mocked $fetch auto-import, so the
// settings toggle must be answered here — a bare {} default would
// leave the feature gate closed and nothing would render.
const defaultFetchImpl = (url: any) => {
  if (String(url).includes('/api/settings/get')) {
    return Promise.resolve({ value: 'true' })
  }
  return Promise.resolve({})
}
const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn((...args: any[]) => {
    if (String(args[0]).includes('/api/settings/get')) {
      return Promise.resolve({ value: 'true' })
    }
    return Promise.resolve({})
  }),
}))
mockNuxtImport('$fetch', () => mockFetch)

mockNuxtImport('useTenantStore', () => {
  return () => ({
    promotionsEnabled: true,
    giftCardsEnabled: true,
  })
})

registerEndpoint('/api/settings/get', () => ({ value: 'true' }))

const cartRef = ref<any>({
  totalPrice: 100,
  promotionDiscount: 0,
  promotionFreeShipping: false,
  appliedCouponCodes: [],
})
const mockRefreshCart = vi.fn()

mockNuxtImport('useCartStore', () => {
  return () => ({
    cart: cartRef,
    refreshCart: mockRefreshCart,
  })
})

// storeToRefs on a plain mock object: hand back the refs directly.
mockNuxtImport('storeToRefs', () => {
  return (store: any) => ({ cart: store.cart })
})

describe('CheckoutCouponInput', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockFetch.mockImplementation(defaultFetchImpl)
    mockRefreshCart.mockReset()
    cartRef.value = {
      totalPrice: 100,
      promotionDiscount: 0,
      promotionFreeShipping: false,
      appliedCouponCodes: [],
    }
  })

  it('applies a code and refreshes the cart', async () => {
    const wrapper = await mountSuspended(CouponInput)
    await new Promise(resolve => setTimeout(resolve, 50))

    ;(wrapper.vm as any).formState.code = 'WELCOME10'
    await wrapper.vm.$nextTick()
    await wrapper.find('form').trigger('submit')
    await new Promise(resolve => setTimeout(resolve, 100))

    const couponCalls = mockFetch.mock.calls.filter(call =>
      String(call[0]).includes('/api/cart/coupon'))
    expect(couponCalls).toHaveLength(1)
    expect((couponCalls[0]![1] as any).body).toEqual({ code: 'WELCOME10' })
    expect(mockRefreshCart).toHaveBeenCalled()
  })

  it('maps the machine-readable rejection reason to a message', async () => {
    mockFetch.mockImplementation((url: any) => {
      if (String(url).includes('/api/cart/coupon')) {
        return Promise.reject(
          Object.assign(new Error('Bad Request'), {
            data: {
              detail: 'refused',
              reason: 'discount_code_minimum_not_met',
            },
          }),
        )
      }
      return defaultFetchImpl(url)
    })

    const wrapper = await mountSuspended(CouponInput)
    await new Promise(resolve => setTimeout(resolve, 50))

    ;(wrapper.vm as any).formState.code = 'WELCOME10'
    await wrapper.vm.$nextTick()
    await wrapper.find('form').trigger('submit')
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(wrapper.text()).toContain('ελάχιστο ποσό')
  })

  it('shows the applied state from the cart and can remove it', async () => {
    cartRef.value = {
      totalPrice: 100,
      promotionDiscount: 10,
      promotionFreeShipping: false,
      appliedCouponCodes: ['WELCOME10'],
    }

    const wrapper = await mountSuspended(CouponInput)
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(wrapper.text()).toContain('WELCOME10')
    expect(wrapper.find('form').exists()).toBe(false)
  })

  describe('B2B promotion gate', () => {
    const wholesale = (allowPromotions: boolean, appliedCouponCodes: string[] = []) => ({
      totalPrice: 100,
      promotionDiscount: 0,
      promotionFreeShipping: false,
      appliedCouponCodes,
      b2bPricing: {
        applied: true,
        groupName: 'Wholesale',
        allowPromotions,
        allowLoyalty: false,
      },
    })

    it('hides the input on a wholesale cart', async () => {
      // The backend refuses new codes with COMBINATION_DISALLOWED, so
      // accepting them here would take codes that never discount.
      cartRef.value = wholesale(false)

      const wrapper = await mountSuspended(CouponInput)
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(wrapper.find('form').exists()).toBe(false)
    })

    it('keeps the widget when a code is already attached, so it can be removed', async () => {
      cartRef.value = wholesale(false, ['WELCOME10'])

      const wrapper = await mountSuspended(CouponInput)
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(wrapper.text()).toContain('WELCOME10')
    })

    it('shows the input when the merchant lets promotions stack', async () => {
      cartRef.value = wholesale(true)

      const wrapper = await mountSuspended(CouponInput)
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(wrapper.find('form').exists()).toBe(true)
    })
  })
})
