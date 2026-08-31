import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import PointsEarned from '~/components/Checkout/PointsEarned.vue'

// Wholesale carts sit outside the loyalty program unless the merchant
// opts in (B2B_LOYALTY_ENABLED, surfaced as cart.b2bPricing.allowLoyalty).
// The backend awards nothing for them, so promising points here would
// advertise a reward that is never granted.

const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn((...args: any[]) => {
    if (String(args[0]).includes('/points')) {
      return Promise.resolve({ potentialPoints: 12 })
    }
    return Promise.resolve({})
  }),
}))
mockNuxtImport('$fetch', () => mockFetch)

// The bootstrap plugin chain calls this too, so the mock has to carry
// the whole surface — a thin one crashes setup and i18n never installs
// ("Need to install with `app.use` function").
const loggedInRef = ref(true)
mockNuxtImport('useUserSession', () => {
  return () => ({
    loggedIn: loggedInRef,
    user: ref({ id: 1 }),
    session: ref({}),
    fetch: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
  })
})

mockNuxtImport('useTenantStore', () => {
  return () => ({ loyaltyEnabled: true })
})

const settingsRef = ref<{ enabled: boolean } | null>({ enabled: true })
mockNuxtImport('useLoyalty', () => {
  return () => ({
    fetchSettings: () => ({ data: settingsRef }),
  })
})

const cartRef = ref<any>({ b2bPricing: null })
const itemsRef = ref<any[]>([
  { product: { id: 3 }, quantity: 2 },
])

mockNuxtImport('useCartStore', () => {
  return () => ({ cart: cartRef, getCartItems: itemsRef })
})

// storeToRefs on a plain mock object: hand back the refs directly.
mockNuxtImport('storeToRefs', () => {
  return (store: any) => ({ cart: store.cart, getCartItems: store.getCartItems })
})

const pointsCalls = () =>
  mockFetch.mock.calls.filter(call => String(call[0]).includes('/points'))

describe('CheckoutPointsEarned — B2B loyalty gate', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    loggedInRef.value = true
    settingsRef.value = { enabled: true }
    cartRef.value = { b2bPricing: null }
    itemsRef.value = [{ product: { id: 3 }, quantity: 2 }]
  })

  it('promises points on a retail cart', async () => {
    const wrapper = await mountSuspended(PointsEarned)
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(pointsCalls().length).toBeGreaterThan(0)
    // 12 points x quantity 2
    expect(wrapper.text()).toContain('24')
  })

  it('promises nothing on a wholesale cart', async () => {
    cartRef.value = {
      b2bPricing: {
        applied: true,
        groupName: 'Wholesale',
        allowPromotions: false,
        allowLoyalty: false,
      },
    }

    const wrapper = await mountSuspended(PointsEarned)
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(wrapper.text()).not.toContain('24')
    // The gate sits on shouldFetch, so it also stops the per-product
    // requests that would compute a number we must not show.
    expect(pointsCalls()).toHaveLength(0)
  })

  it('promises points again when the merchant opts in', async () => {
    cartRef.value = {
      b2bPricing: {
        applied: true,
        groupName: 'Wholesale',
        allowPromotions: false,
        allowLoyalty: true,
      },
    }

    const wrapper = await mountSuspended(PointsEarned)
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(pointsCalls().length).toBeGreaterThan(0)
    expect(wrapper.text()).toContain('24')
  })

  it('is unaffected by a b2b block that never applied', async () => {
    cartRef.value = {
      b2bPricing: { applied: false, allowLoyalty: false },
    }

    const wrapper = await mountSuspended(PointsEarned)
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(pointsCalls().length).toBeGreaterThan(0)
    expect(wrapper.text()).toContain('24')
  })
})
