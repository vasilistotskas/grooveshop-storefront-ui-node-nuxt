import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockComponent, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import ProductDetail from '~/components/Storefront/ProductDetail.vue'
import WebsideProductDetail from '~/components/variants/webside/Storefront/ProductDetail.vue'
import { makeProduct, makeProductReview } from '~~/test/fixtures/product'
import { makeCategory } from '~~/test/fixtures/productFilters'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * A product page counts one view of the product in its route, on the
 * client (`useViewCount` posts nothing during SSR).
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)
mockNuxtImport('useRequestApi', () => () => api)

// UTooltip needs UApp's TooltipProvider, which a bare mount does not have.
mockComponent('UTooltip', { template: '<div><slot /></div>' })

// The default page mounts the alerts dialog on its first open; its own
// spec covers it, this one only what the page hands it.
vi.mock('~/components/Product/NotifyMe.vue', () => ({
  default: {
    props: { productId: Number, productName: String, soldOut: Boolean, priceDrop: Boolean, kind: String, open: Boolean },
    template: '<div data-testid="notify" :data-kind="kind" :data-sold-out="String(soldOut)" />',
  },
}))

const { route } = vi.hoisted(() => ({ route: { params: { id: '123', slug: 'bluetooth-speaker' } } }))
mockNuxtImport('useRoute', () => () => ({
  params: route.params,
  query: {},
  path: `/products/${route.params.id}/${route.params.slug}`,
  fullPath: `/products/${route.params.id}/${route.params.slug}`,
  name: 'products-id-slug___el',
  hash: '',
  matched: [],
  meta: {},
}))

describe.each([
  ['default', ProductDetail],
  ['webside', WebsideProductDetail],
])('ProductDetail view count (%s tree)', (_tree, Component) => {
  beforeEach(() => {
    clearNuxtData()
    setTenant()
    const empty = { count: 0, next: null, previous: null, results: [] }
    api.routes({
      '/api/products/123': makeProduct({ id: 123 }),
      '/api/products/123/images': [],
      '/api/products/categories/all': [],
      '/api/products/123/*': empty,
      '/api/*': empty,
    })
  })

  it('posts one view for the product in the route', async () => {
    const wrapper = await mountSuspended(Component, { route: false })
    await flushPromises()

    expect(api.callsTo('/api/products/*').filter(call => call.url.endsWith('/update-view-count'))).toEqual([
      { url: '/api/products/123/update-view-count', options: expect.objectContaining({ method: 'POST' }) },
    ])
    wrapper.unmount()
  })
})

describe.each([
  ['default', ProductDetail],
  ['webside', WebsideProductDetail],
])('ProductDetail price (%s tree)', (_tree, Component) => {
  const money = (value: number) => useNuxtApp().$i18n.n(value, 'currency')

  function serve(product: ReturnType<typeof makeProduct>) {
    clearNuxtData()
    setTenant()
    const empty = { count: 0, next: null, previous: null, results: [] }
    api.routes({
      '/api/products/123': product,
      '/api/products/123/images': [],
      '/api/products/categories/all': [],
      '/api/products/123/*': empty,
      '/api/*': empty,
    })
  }

  // Net 50, 24 % VAT, 10 % off: final 57, pre-discount gross 62. The
  // net price is below the final one, so striking it read as a rise.
  it('strikes the VAT-inclusive pre-discount price beside a discounted final price', async () => {
    serve(makeProduct({ id: 123, price: 50, vatPercent: 24, discountPercent: 10 }))
    const wrapper = await mountSuspended(Component, { route: false })
    await flushPromises()

    expect(wrapper.findAll('.line-through').map(node => node.text())).toEqual([money(62)])
    expect(wrapper.text()).toContain(money(57))
    wrapper.unmount()
  })

  it('strikes nothing for an undiscounted product', async () => {
    serve(makeProduct({ id: 123, price: 50, vatPercent: 24, discountPercent: 0 }))
    const wrapper = await mountSuspended(Component, { route: false })
    await flushPromises()

    expect(wrapper.findAll('.line-through')).toHaveLength(0)
    wrapper.unmount()
  })
})

/**
 * The Groove Volt product page: the category trail, the buy box's stock
 * line, the review list and the alerts dialog.
 */
describe('default ProductDetail', () => {
  const empty = { count: 0, next: null, previous: null, results: [] }
  const CATEGORIES = [
    makeCategory({ id: 1, name: { el: 'Φόρτιση', en: 'Charging' } }),
    makeCategory({ id: 2, name: { el: 'Power banks', en: 'Power banks' }, parent: 1, level: 1 }),
  ]

  /** The detail endpoint answers a product plus the review breakdown the list shape lacks. */
  function serve(
    product: ReturnType<typeof makeProduct>,
    reviews: (page: number) => unknown = () => empty,
    ratingDistribution: RatingDistribution[] = [],
    settings: Record<string, string> = {},
  ) {
    clearNuxtData()
    setTenant()
    api.routes({
      '/api/products/123': { ...product, ratingDistribution },
      '/api/products/123/images': [],
      '/api/products/categories/all': CATEGORIES,
      '/api/settings/public': { settings },
      '/api/products/123/reviews': (_url: string, options?: { query?: { page?: number } }) => reviews(options?.query?.page ?? 1),
      '/api/products/123/*': empty,
      '/api/*': empty,
    })
  }

  const mountPage = async () => {
    const wrapper = await mountSuspended(ProductDetail, { route: false })
    await flushPromises()
    return wrapper
  }

  it('promises same-business-day dispatch before the store\'s cutoff', async () => {
    serve(makeProduct({ id: 123, stock: 20 }), () => empty, [], { DISPATCH_CUTOFF: '15:00' })

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Παράγγειλε πριν τις 15:00 και αποστέλλεται την ίδια εργάσιμη')
  })

  it.each([
    ['sets no cutoff', { DISPATCH_CUTOFF: '' }, 20],
    ['writes a cutoff that is no clock time', { DISPATCH_CUTOFF: 'before lunch' }, 20],
    ['has the product sold out', { DISPATCH_CUTOFF: '15:00' }, 0],
  ])('promises no dispatch when the store %s', async (_name, settings, stock) => {
    serve(makeProduct({ id: 123, stock }), () => empty, [], settings)

    const wrapper = await mountPage()

    expect(wrapper.text()).not.toContain('αποστέλλεται την ίδια εργάσιμη')
  })

  it('places the product under its category trail', async () => {
    serve(makeProduct({ id: 123, category: 2 }))
    const wrapper = await mountPage()

    const crumbs = wrapper.get('nav[aria-label="breadcrumb"]').findAll('li').map(li => li.text()).filter(Boolean)
    expect(crumbs).toEqual(['Αρχική', 'Φόρτιση', 'Power banks', 'Προϊόν 123'])
  })

  it('places a product outside the catalogue tree under the full listing', async () => {
    serve(makeProduct({ id: 123, category: 99 }))
    const wrapper = await mountPage()

    const crumbs = wrapper.get('nav[aria-label="breadcrumb"]').findAll('li').map(li => li.text()).filter(Boolean)
    expect(crumbs).toEqual(['Αρχική', 'Προϊόντα', 'Προϊόν 123'])
  })

  it.each([
    { stock: 40, line: 'Διαθέσιμο' },
    { stock: 3, line: 'Έμειναν μόνο 3' },
    { stock: 0, line: 'Εξαντλήθηκε' },
  ])('says $line for a stock of $stock', async ({ stock, line }) => {
    serve(makeProduct({ id: 123, stock }))
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain(line)
  })

  it('names what the discount saves beside the struck price', async () => {
    // Net 50, 24 % VAT, 10 % off: final 57 against a gross 62.
    serve(makeProduct({ id: 123, price: 50, vatPercent: 24, discountPercent: 10 }))
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain(`Κερδίζεις ${useNuxtApp().$i18n.n(5, 'currency')}`)
  })

  it('opens the restock alert from the stock line of a sold-out product', async () => {
    serve(makeProduct({ id: 123, stock: 0 }))
    const wrapper = await mountPage()
    expect(wrapper.find('[data-testid="notify"]').exists()).toBe(false)

    await wrapper.findAll('button').find(b => b.text() === 'Ειδοποίησέ με')!.trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[data-testid="notify"]').exists()).toBe(true))

    const notify = wrapper.get('[data-testid="notify"]')
    expect(notify.attributes('data-kind')).toBe('restock')
    expect(notify.attributes('data-sold-out')).toBe('true')
  })

  it('shows three reviews, then the rest of the page, then a page more per click', async () => {
    const reviews = (page: number) => ({
      count: 14,
      next: page === 1 ? 'next' : null,
      previous: null,
      results: Array.from({ length: page === 1 ? 12 : 2 }, (_, i) => makeProductReview({ id: (page - 1) * 12 + i + 1 })),
    })
    serve(makeProduct({ id: 123, reviewAverage: 8, reviewCount: 14 }), reviews, [{ rate: 10, count: 14 }])
    const wrapper = await mountPage()
    const shown = () => wrapper.findAll('#reviews article').length
    const button = (label: string) => wrapper.findAll('#reviews button').find(b => b.text() === label)!

    expect(shown()).toBe(3)
    // The summary's bars come from the product's own distribution, not the loaded reviews.
    expect(wrapper.get('#reviews ul').findAll('li')[0]!.text()).toContain('100%')

    await button('Δες και τις 14 αξιολογήσεις').trigger('click')
    await flushPromises()
    expect(shown()).toBe(12)
    expect(api.callsTo('/api/products/123/reviews').filter(call => call.options?.query?.page === 2)).toHaveLength(0)

    await button('Περισσότερες αξιολογήσεις').trigger('click')
    await flushPromises()
    expect(api.callsTo('/api/products/123/reviews').filter(call => call.options?.query?.page === 2)).toHaveLength(1)
    expect(shown()).toBe(14)
    expect(wrapper.findAll('#reviews button').find(b => b.text() === 'Περισσότερες αξιολογήσεις')).toBeUndefined()
  })

  it('marks the page for the footer to keep clear of the sticky buy bar', async () => {
    serve(makeProduct({ id: 123 }))
    const wrapper = await mountPage()

    expect(wrapper.find('[data-action-bar]').exists()).toBe(true)
  })
})
