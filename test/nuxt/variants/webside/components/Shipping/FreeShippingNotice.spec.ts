import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import FreeShippingNotice from '~/components/variants/webside/Shipping/FreeShippingNotice.vue'

const buildResponse = (overrides: Record<string, unknown> = {}) => ({
  providers: [
    {
      providerCode: 'boxnow',
      providerName: 'BOX NOW',
      kind: 'pickup_point',
      threshold: 30,
      priority: 20,
    },
  ],
  minThreshold: 30,
  maxThreshold: 30,
  currency: 'EUR',
  // Echoes the country ``free_shipping_info`` resolved for (the
  // caller's ``country_code``, else the first shippable country) —
  // FreeShippingNotice doesn't read it (no delivery country is known
  // this early on the PDP/cart), but the fixture mirrors the real
  // response shape.
  countryCode: 'GR',
  ...overrides,
})

describe('FreeShippingNotice', () => {
  beforeEach(() => {
    registerEndpoint('/api/shipping/free-shipping-info', () => buildResponse())
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders the headline threshold when no cartTotal is supplied', async () => {
    const wrapper = await mountSuspended(FreeShippingNotice)
    expect(wrapper.text()).toContain('30')
    expect(wrapper.text()).toContain('Δωρεάν μεταφορικά')
  })

  it('shows the remaining-to-free message when cartTotal is below the threshold', async () => {
    const wrapper = await mountSuspended(FreeShippingNotice, {
      props: { cartTotal: 22 },
    })
    // 30 - 22 = 8 €
    expect(wrapper.text()).toContain('8')
    expect(wrapper.text()).toContain('Πρόσθεσε')
  })

  it('shows the qualified state when cartTotal meets or exceeds the threshold', async () => {
    const wrapper = await mountSuspended(FreeShippingNotice, {
      props: { cartTotal: 50 },
    })
    expect(wrapper.text()).toContain('Έχεις')
  })
})

describe('FreeShippingNotice — empty response', () => {
  beforeEach(() => {
    registerEndpoint('/api/shipping/free-shipping-info', () =>
      buildResponse({ providers: [], minThreshold: null, maxThreshold: null }),
    )
  })

  it('renders nothing when no carrier advertises a threshold', async () => {
    const wrapper = await mountSuspended(FreeShippingNotice)
    // UAlert root absent → component output is empty.
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })
})
