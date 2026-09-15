import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'
import ProductOffers from '~/components/Product/Offers.vue'

/**
 * The product page's offer panel.
 *
 * Django decides WHICH offers touch the product and why; this pins the
 * two things the component itself owns — the two-tier commercial gate
 * (fail CLOSED) and the split that keeps a store-wide offer from
 * burying the one that is actually about this item.
 */

const PUBLIC_SETTINGS = { settings: { PROMOTIONS_ENABLED: 'true' } }

let offers: any[] = []
let promotionsPlanEnabled = true
let runtimeSettings: Record<string, string> = { PROMOTIONS_ENABLED: 'true' }

const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn((..._args: any[]) => Promise.resolve({})),
}))
mockNuxtImport('$fetch', () => mockFetch)
registerEndpoint('/api/settings/public', () => PUBLIC_SETTINGS)

mockNuxtImport('useTenantStore', () => {
  return () => ({ get promotionsEnabled() { return promotionsPlanEnabled } })
})

function offer(over: Record<string, any> = {}) {
  return {
    id: 1,
    name: 'Προσφορά',
    description: '',
    trigger: 'AUTOMATIC',
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
    relation: 'ORDER',
    ...over,
  }
}

let wrapper: any
async function mount() {
  wrapper = await mountSuspended(ProductOffers, { props: { productId: 2 } })
  await new Promise(resolve => setTimeout(resolve, 200))
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('ProductOffers', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockFetch.mockImplementation((url: any) => {
      if (String(url).includes('/api/promotions/product/')) {
        return Promise.resolve(offers)
      }
      if (String(url).includes('/api/settings/public')) {
        return Promise.resolve({ settings: runtimeSettings })
      }
      return Promise.resolve({})
    })
    offers = []
    promotionsPlanEnabled = true
    runtimeSettings = { PROMOTIONS_ENABLED: 'true' }
    clearNuxtData('product-offers-2')
  })

  afterEach(() => {
    wrapper?.unmount?.()
    wrapper = undefined
  })

  it('renders nothing when no offer touches the product', async () => {
    const wrapper = await mount()

    expect(wrapper.find('section').exists()).toBe(false)
  })

  it('shows the count of every offer that applies', async () => {
    offers = [
      offer({ id: 1, relation: 'PRODUCT' }),
      offer({ id: 2, relation: 'CATEGORY' }),
      offer({ id: 3, relation: 'ORDER' }),
    ]

    const wrapper = await mount()

    expect(wrapper.find('section').exists()).toBe(true)
    expect(wrapper.text()).toContain('3')
  })

  it('renders product-specific offers openly and store-wide ones behind a toggle', async () => {
    offers = [
      offer({ id: 1, relation: 'PRODUCT', name: 'Μόνο για αυτό' }),
      offer({ id: 2, relation: 'ORDER', name: 'Σε όλο το κατάστημα' }),
      offer({ id: 3, relation: 'ORDER', name: 'Και αυτό παντού' }),
    ]

    const wrapper = await mount()

    // The specific one is in the open list; the collapsible keeps the
    // other two out of the way (UCollapsible unmounts hidden content).
    expect(wrapper.text()).toContain('Μόνο για αυτό')
    expect(wrapper.text()).not.toContain('Και αυτό παντού')
  })

  it('opens the store-wide list by default when nothing is specific', async () => {
    // With no product-specific offer the panel would otherwise render a
    // header, a count and an empty body.
    offers = [offer({ id: 2, relation: 'ORDER', name: 'Σε όλο το κατάστημα' })]

    const wrapper = await mount()

    expect(wrapper.text()).toContain('Σε όλο το κατάστημα')
  })

  it('shows a coupon code and hides the copy affordance for automatic offers', async () => {
    offers = [
      offer({ id: 1, relation: 'PRODUCT', trigger: 'CODE', code: 'PICK20' }),
      offer({ id: 2, relation: 'PRODUCT', trigger: 'AUTOMATIC', code: null }),
    ]

    const wrapper = await mount()

    expect(wrapper.text()).toContain('PICK20')
    expect(wrapper.findAll('code')).toHaveLength(1)
  })

  it('renders nothing when the tenant plan flag is off', async () => {
    // Fails CLOSED: a commercial surface must not leak on a plan that
    // does not include it, even if the endpoint answered.
    offers = [offer({ id: 1, relation: 'PRODUCT' })]
    promotionsPlanEnabled = false

    const wrapper = await mount()

    expect(wrapper.find('section').exists()).toBe(false)
  })

  it('renders nothing when the merchant runtime toggle is off', async () => {
    offers = [offer({ id: 1, relation: 'PRODUCT' })]
    runtimeSettings = { PROMOTIONS_ENABLED: 'false' }

    const wrapper = await mount()

    expect(wrapper.find('section').exists()).toBe(false)
  })
})
