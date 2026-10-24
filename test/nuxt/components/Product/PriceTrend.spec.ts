import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockComponent, mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import PriceTrend from '~/components/Product/PriceTrend.vue'
import { setTenantFeatures } from '~~/test/helpers/tenant'

/**
 * The product page's price trend, mocked at the request (`useLazyApi`
 * transports through `$fetch`). Time is pinned: the ranges on offer
 * depend on how old the first recorded price is.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)
// UTooltip needs UApp's TooltipProvider, which a bare mount does not have.
mockComponent('UTooltip', { template: '<div><slot /></div>' })

const HISTORY = '/api/products/43/price-history'
const KEY = 'product-price-history-43'

const changed: ProductPriceHistory = {
  currency: 'EUR',
  spells: [
    { validFrom: '2026-08-21T15:20:28Z', validTo: '2026-09-21T15:20:28Z', price: 49.48 },
    { validFrom: '2026-09-21T15:20:28Z', validTo: null, price: 39.58 },
  ],
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-24T12:00:00Z'))
  clearNuxtData(KEY)
  clearNuxtState('price-trend-now-43')
  setTenantFeatures({ priceHistory: true })
  api.routes({ [HISTORY]: changed })
})

afterEach(() => {
  vi.useRealTimers()
})

async function mountTrend() {
  const wrapper = await mountSuspended(PriceTrend, {
    props: { productId: 43, productName: 'Powerbank' },
    route: false,
  })
  await flushPromises()
  return wrapper
}

describe('Product/PriceTrend', () => {
  // No rolling 30-day lowest: the page's prior price already names the
  // Omnibus reference, and a second "30-day" figure would contradict it.
  it('states the range\'s change, lowest and highest price, and nothing more', async () => {
    const wrapper = await mountTrend()

    const stats = wrapper.findAll('dl > div').map(tile => tile.find('dd').text().replace(/\s+/g, ' '))
    expect(stats).toHaveLength(3)
    expect(stats[0]).toContain('9,90')
    expect(stats[0]).toContain('−')
    expect(stats.slice(1)).toEqual(['39,58 €', '49,48 €'])
  })

  it('offers only the ranges the history reaches', async () => {
    const wrapper = await mountTrend()

    const tabs = wrapper.findAll('[role="tab"]').map(tab => tab.text())
    expect(tabs).toHaveLength(2)
  })

  it('names the chart for assistive technology', async () => {
    const wrapper = await mountTrend()

    expect(wrapper.find('[aria-label*="Powerbank"]').exists()).toBe(true)
  })

  it('says the price is unchanged instead of drawing a flat line', async () => {
    api.routes({ [HISTORY]: { currency: 'EUR', spells: [{ validFrom: '2026-10-10T10:00:00Z', validTo: null, price: 20 }] } })
    const wrapper = await mountTrend()

    expect(wrapper.find('dl').exists()).toBe(false)
    expect(wrapper.text()).toContain('2026')
  })

  it('asks for nothing and renders nothing with the store\'s price history off', async () => {
    setTenantFeatures({ priceHistory: false })
    const wrapper = await mountTrend()

    expect(api.callsTo(HISTORY)).toEqual([])
    expect(wrapper.find('section').exists()).toBe(false)
  })
})
