import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockComponent, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { el as uiLocale } from '@nuxt/ui/locale'
import ProductDetail from '~/components/Storefront/ProductDetail.vue'
import WebsideProductDetail from '~/components/variants/webside/Storefront/ProductDetail.vue'
import PriorPrice from '~/components/Product/PriorPrice.vue'
import { makeProduct, makeProductReview } from '~~/test/fixtures/product'
import { makeCategory } from '~~/test/fixtures/productFilters'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'
import { trees } from '~~/test/helpers/trees'

// The wholesale price is hydrated on the client for a signed-in business
// customer (useB2BPricing's own spec covers how); here it is what the
// page is told.
const { b2bPrice } = vi.hoisted(() => ({
  b2bPrice: vi.fn((_id: number): { finalPrice: string } | undefined => undefined),
}))
mockNuxtImport('useB2BPricing', () => () => ({ register: vi.fn(), priceFor: b2bPrice }))

// Webside shows its sticky buy bar once the window has scrolled past
// 350px (the default watches its own buy row instead).
const { windowScrollY } = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return { windowScrollY: ref(0) }
})
mockNuxtImport('useWindowScroll', () => () => ({ y: windowScrollY }))

// The product's own requests, by key: a request still in flight survives
// a bare clearNuxtData(), and the next mount would join it.
const clearProductData = () => clearNuxtData(['product123', 'productImages123', 'productReviewsSchema123'])

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
// The price trend dialog loads its own history; its own spec covers it.
vi.mock('~/components/Product/PriceTrendDialog.vue', () => ({
  default: {
    props: { productId: Number, productName: String, open: Boolean },
    template: '<div data-testid="price-trend" :data-product-id="productId" :data-open="String(open)" />',
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

  // Net 50, 24 % VAT: 62 gross. The lowest price of the 30 days before the
  // reduction was 80, and the shopper pays 62, so Django announces 22 %.
  it('strikes the prior price, named as the lowest of the last 30 days, beside the effective price', async () => {
    serve(makeProduct({ id: 123, price: 50, vatPercent: 24, priorPrice: 80, announcedDiscountPercent: 22 }))
    const wrapper = await mountSuspended(Component, { route: false })
    await flushPromises()

    expect(wrapper.findAll('s').map(node => node.text())).toEqual([money(80)])
    expect(wrapper.text()).toContain('Χαμηλότερη τιμή 30 ημερών πριν την έκπτωση')
    expect(wrapper.text()).toContain(money(62))
    wrapper.unmount()
  })

  it('shows the effective price, not the final price an unconditional promotion lowers', async () => {
    serve(makeProduct({ id: 123, price: 50, vatPercent: 24, effectivePrice: 55 }))
    const wrapper = await mountSuspended(Component, { route: false })
    await flushPromises()

    expect(wrapper.text()).toContain(money(55))
    expect(wrapper.text()).not.toContain(money(62))
    wrapper.unmount()
  })

  it('announces nothing for a markdown that has no prior price', async () => {
    serve(makeProduct({ id: 123, price: 50, vatPercent: 24, discountPercent: 10 }))
    const wrapper = await mountSuspended(Component, { route: false })
    await flushPromises()

    expect(wrapper.find('s').exists()).toBe(false)
    // No announced reduction: the prior-price line (its own spec covers its copy) is not drawn.
    expect(wrapper.findComponent(PriorPrice).exists()).toBe(false)
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
 * A product the store has not translated into the page's language (here
 * Greek, on a store authored in English) shows the store's language,
 * never a blank heading or an empty description (`extractTranslated`).
 */
describe.each([
  ['default', ProductDetail],
  ['webside', WebsideProductDetail],
])('ProductDetail of a product not written in the page\'s language (%s tree)', (_tree, Component) => {
  beforeEach(() => {
    clearNuxtData()
    setTenant({ defaultLocale: 'en', availableLocales: ['el', 'en'] })
    const empty = { count: 0, next: null, previous: null, results: [] }
    api.routes({
      '/api/products/123': makeProduct({
        id: 123,
        translations: {
          en: { name: 'Travel charger', description: '<p>Charges two phones at once.</p>', seoTitle: '', seoDescription: '', seoKeywords: '' },
        },
      }),
      '/api/products/123/images': [],
      '/api/products/categories/all': [],
      '/api/products/123/*': empty,
      '/api/*': empty,
    })
  })

  it('names it and describes it in the store\'s language', async () => {
    const wrapper = await mountSuspended(Component, { route: false })
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('Travel charger')
    expect(wrapper.text()).toContain('Charges two phones at once.')
    wrapper.unmount()
  })
})

/**
 * The Groove Volt product page: the category trail, the buy box's stock
 * line, the review list and the alerts dialog.
 */
// Captures the Product node each page hands to the schema.org module.
const { schemaNodes } = vi.hoisted(() => ({ schemaNodes: [] as unknown[] }))
mockNuxtImport('useSchemaOrg', () => (nodes: unknown[]) => {
  schemaNodes.push(...nodes)
})
mockNuxtImport('defineProduct', () => (input: unknown) => ({ product: input }))

describe.each([
  ['default', ProductDetail],
  ['webside', WebsideProductDetail],
])('ProductDetail structured data (%s tree)', (_tree, Component) => {
  /** `api.routes` replaces the whole table, so a case's product goes through here. */
  function serve(product = makeProduct({ id: 123 })) {
    const empty = { count: 0, next: null, previous: null, results: [] }
    api.routes({
      '/api/products/123': product,
      '/api/products/123/images': [
        { id: 1, mainImagePath: 'media/acme/uploads/products/a.jpg', image: 'https://static.platform.test/media/acme/uploads/products/a.jpg' },
        { id: 2, mainImagePath: 'media/acme/uploads/products/b.png', image: 'https://static.platform.test/media/acme/uploads/products/b.png' },
      ],
      '/api/products/categories/all': [],
      '/api/products/123/*': empty,
      '/api/*': empty,
    })
  }

  beforeEach(() => {
    clearNuxtData()
    setTenant({ assetsDomain: 'assets.shop.test' })
    schemaNodes.length = 0
    serve()
  })

  // The catalogue feeds' variant, so search engines see one URL per image
  // across the structured data, the sitemap and the Google / Meta feeds,
  // never the original (which the static host only redirects).
  it('lists each image as its media-stream search variant, not the original', async () => {
    await mountSuspended(Component, { route: false })
    await flushPromises()

    const node = schemaNodes.find(n => (n as { product?: unknown }).product) as { product: { value: { image?: string[] } } }
    expect(node.product.value.image).toEqual([
      'https://assets.shop.test/media_stream-image/media/acme/uploads/products/a.jpg/1000/1000/contain/center/FFFFFF/5/85.jpeg',
      'https://assets.shop.test/media_stream-image/media/acme/uploads/products/b.png/1000/1000/contain/center/FFFFFF/5/85.jpeg',
    ])
  })

  type ProductNode = { product: { value: { description?: string, offers: Record<string, unknown> } } }
  const productNode = () => schemaNodes.find(n => (n as { product?: unknown }).product) as ProductNode

  // A rich-text description reaches the structured data as the text a
  // reader sees: no tags, no entities, no line breaks of the HTML.
  it('describes the product in plain text', async () => {
    serve(makeProduct({
      id: 123,
      translations: { el: { name: 'Φορτιστής', description: '\n&nbsp;\n<p>Δύο&nbsp;θύρες</p>\n<ul><li>USB-C &amp; Lightning</li></ul>', seoTitle: '', seoDescription: '', seoKeywords: '' } },
    }))

    await mountSuspended(Component, { route: false })
    await flushPromises()

    expect(productNode().product.value.description).toBe('Δύο θύρες USB-C & Lightning')
  })

  // The offer states the store's currency and nothing the store has not
  // set: no shipping rate, delivery time or return policy of its own.
  it('prices the offer in the store\'s currency, with no invented shipping or return terms', async () => {
    setTenant({ assetsDomain: 'assets.shop.test', defaultCurrency: 'USD' })

    await mountSuspended(Component, { route: false })
    await flushPromises()

    const { offers } = productNode().product.value
    expect(offers.priceCurrency).toBe('USD')
    expect(offers).not.toHaveProperty('shippingDetails')
    expect(offers).not.toHaveProperty('hasMerchantReturnPolicy')
  })
})

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

    expect(wrapper.text()).toContain('Παράγγειλε πριν τις 15:00 (ώρα Ελλάδας) και αποστέλλεται την ίδια εργάσιμη')
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

    const crumbs = wrapper.get(`nav[aria-label="${uiLocale.messages.breadcrumb.label}"]`).findAll('li').map(li => li.text()).filter(Boolean)
    expect(crumbs).toEqual(['Αρχική', 'Φόρτιση', 'Power banks', 'Προϊόν 123'])
  })

  it('places a product outside the catalogue tree under the full listing', async () => {
    serve(makeProduct({ id: 123, category: 99 }))
    const wrapper = await mountPage()

    const crumbs = wrapper.get(`nav[aria-label="${uiLocale.messages.breadcrumb.label}"]`).findAll('li').map(li => li.text()).filter(Boolean)
    expect(crumbs).toEqual(['Αρχική', 'Προϊόντα', 'Προϊόν 123'])
  })

  // Google reads a category as its trail by name; the id said nothing.
  it('names the category trail in the structured data, and no category outside the tree', async () => {
    const category = () => (schemaNodes.find(n => (n as { product?: unknown }).product) as { product: { value: { category?: string } } }).product.value.category

    schemaNodes.length = 0
    serve(makeProduct({ id: 123, category: 2 }))
    await mountPage()
    expect(category()).toBe('Φόρτιση > Power banks')

    schemaNodes.length = 0
    serve(makeProduct({ id: 123, category: 99 }))
    await mountPage()
    expect(category()).toBeUndefined()
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

  it('names what the announced reduction saves against its prior price', async () => {
    // The shopper pays 62 against a prior price of 80.
    serve(makeProduct({ id: 123, price: 50, vatPercent: 24, priorPrice: 80, announcedDiscountPercent: 22 }))
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain(`Κερδίζεις ${useNuxtApp().$i18n.n(18, 'currency')}`)
  })

  it('names no saving for a markdown that has no prior price', async () => {
    serve(makeProduct({ id: 123, price: 50, vatPercent: 24, discountPercent: 10 }))
    const wrapper = await mountPage()

    expect(wrapper.text()).not.toContain('Κερδίζεις')
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

  it('marks the page for the footer to keep clear of the sticky buy bar', async () => {
    serve(makeProduct({ id: 123 }))
    const wrapper = await mountPage()

    expect(wrapper.find('[data-action-bar]').exists()).toBe(true)
  })
})

/**
 * The reviews of a product page are ONE implementation: webside's page
 * mounts the same section, rating link and list as the default one, so
 * every case here runs over both trees.
 */
describe.each([
  ['default', ProductDetail],
  ['webside', WebsideProductDetail],
])('ProductDetail reviews (%s tree)', (_tree, Component) => {
  const empty = { count: 0, next: null, previous: null, results: [] }

  const reviews = (page: number) => ({
    count: 14,
    next: page === 1 ? 'next' : null,
    previous: null,
    results: Array.from({ length: page === 1 ? 12 : 2 }, (_, i) => makeProductReview({ id: (page - 1) * 12 + i + 1 })),
  })

  function serve(settings: Record<string, string> = {}) {
    clearNuxtData()
    setTenant()
    api.routes({
      '/api/products/123': { ...makeProduct({ id: 123, reviewAverage: 8.6, reviewCount: 14 }), ratingDistribution: [{ rate: 10, count: 14 }] },
      '/api/products/123/images': [],
      '/api/products/categories/all': [],
      '/api/settings/public': { settings },
      '/api/products/123/reviews': (_url: string, options?: { query?: { page?: number } }) => reviews(options?.query?.page ?? 1),
      '/api/products/123/*': empty,
      '/api/*': empty,
    })
  }

  const mountPage = async () => {
    const wrapper = await mountSuspended(Component, { route: false })
    await flushPromises()
    return wrapper
  }

  it('shows three reviews, then the rest of the page, then a page more per click', async () => {
    serve()
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

  it('fetches the first page newest first, for the page and its structured data', async () => {
    serve()
    await mountPage()

    expect(api.callsTo('/api/products/123/reviews')[0]!.options?.query).toMatchObject({ ordering: '-createdAt' })
  })

  it('links the rating by the title to the reviews, as 4,3 · 14 reviews', async () => {
    serve()
    const wrapper = await mountPage()

    const link = wrapper.get('a[href="#reviews"]')
    expect(link.text()).toBe('4,3 · 14 αξιολογήσεις')
    expect(link.attributes('aria-label')).toBe('Βαθμολογία 4,3 στα 5, από 14 αξιολογήσεις')
    // The model's own 1..10 scale never reaches a reader.
    expect(wrapper.get('#reviews').text()).not.toMatch(/\/\s*10/)
  })

  it('invites a guest to sign in to write one', async () => {
    serve()
    const wrapper = await mountPage()

    expect(wrapper.get('#reviews').text()).toContain('Συνδέσου για να γράψεις κριτική')
  })

  it('asks for no reviews, and shows no rating or section, when the store has reviews off', async () => {
    // Django's feature for the default tree (and the shared review parts
    // webside mounts); the setting is what the frozen page itself reads.
    serve({ PRODUCT_REVIEWS_ENABLED: 'False' })
    setTenantFeatures({ productReviews: false })

    const wrapper = await mountPage()

    expect(api.callsTo('/api/products/123/reviews')).toEqual([])
    expect(wrapper.find('#reviews').exists()).toBe(false)
    expect(wrapper.find('a[href="#reviews"]').exists()).toBe(false)
  })
})

/**
 * The price trend follows the store's setting in both trees: a store with
 * it on gets the button beside the rating, one with it off renders as if
 * the feature did not exist.
 */
describe.each([
  ['default', ProductDetail],
  ['webside', WebsideProductDetail],
])('ProductDetail price trend (%s tree)', (_tree, Component) => {
  const empty = { count: 0, next: null, previous: null, results: [] }

  function serve() {
    clearNuxtData()
    setTenant()
    api.routes({
      '/api/products/123': { ...makeProduct({ id: 123 }), ratingDistribution: [] },
      '/api/products/123/images': [],
      '/api/products/categories/all': [],
      '/api/settings/public': { settings: {} },
      '/api/products/123/*': empty,
      '/api/*': empty,
    })
  }

  const mountPage = async () => {
    const wrapper = await mountSuspended(Component, { route: false })
    await flushPromises()
    return wrapper
  }

  /** The button that opens the price trend: it draws the trend icon. */
  const priceTrendButton = (wrapper: Awaited<ReturnType<typeof mountPage>>) =>
    wrapper.findAllComponents({ name: 'UButton' }).find(b => b.props('icon') === 'i-lucide-chart-line')

  it('opens the price trend from a button beside the rating, loading nothing before', async () => {
    serve()
    setTenantFeatures({ priceHistory: true })
    const wrapper = await mountPage()

    expect(wrapper.find('[data-testid="price-trend"]').exists()).toBe(false)
    expect(api.callsTo('/api/products/123/price-history')).toEqual([])
    const button = priceTrendButton(wrapper)
    expect(button?.attributes('aria-haspopup')).toBe('dialog')
    await button!.trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[data-testid="price-trend"]').attributes()).toMatchObject({
      'data-product-id': '123',
      'data-open': 'true',
    }))
  })

  it('offers no price trend for a store with it off', async () => {
    serve()
    setTenantFeatures({ priceHistory: false })
    const wrapper = await mountPage()

    expect(priceTrendButton(wrapper)).toBeUndefined()
  })
})

/**
 * Both drawings take the product and the price this shopper pays from
 * useProductDetail (whose own spec covers the 404/503): one
 * implementation, so a row that fails here is a drawing that drifted.
 */
describe.each(trees(ProductDetail, WebsideProductDetail))('$tree ProductDetail shopper price', ({ tree, C }) => {
  const money = (value: number) => useNuxtApp().$i18n.n(value, 'currency')
  const empty = { count: 0, next: null, previous: null, results: [] }
  // The drawings strike a price differently: the default with <s>, the
  // frozen webside copy with a line-through span.
  const struck = tree === 'default' ? 's' : '.line-through'

  function serve(product: ReturnType<typeof makeProduct>) {
    clearNuxtData()
    clearProductData()
    setTenant()
    api.routes({
      '/api/products/123': product,
      '/api/products/123/images': [],
      '/api/products/categories/all': [],
      '/api/products/123/*': empty,
      '/api/*': empty,
    })
  }

  // Net 50 at 24 % VAT is 62 retail, announced as a 22 % reduction from 80.
  it('swaps in a lower wholesale price, strikes the retail one and announces no reduction', async () => {
    b2bPrice.mockImplementation(id => (id === 123 ? { finalPrice: '40' } : undefined))
    serve(makeProduct({ id: 123, price: 50, vatPercent: 24, priorPrice: 80, announcedDiscountPercent: 22 }))

    const wrapper = await mountSuspended(C, { route: false })
    await flushPromises()

    expect(wrapper.text()).toContain(money(40))
    expect(wrapper.findAll(struck).map(node => node.text())).toEqual([money(62)])
    // No announced reduction: the prior-price line (its own spec covers its copy) is not drawn.
    expect(wrapper.findComponent(PriorPrice).exists()).toBe(false)
    wrapper.unmount()
  })

  it('ignores a wholesale price that is not lower than retail', async () => {
    b2bPrice.mockImplementation(() => ({ finalPrice: '70' }))
    serve(makeProduct({ id: 123, price: 50, vatPercent: 24, discountPercent: 0 }))

    const wrapper = await mountSuspended(C, { route: false })
    await flushPromises()

    expect(wrapper.text()).toContain(money(62))
    expect(wrapper.text()).not.toContain(money(70))
    expect(wrapper.findAll(struck)).toHaveLength(0)
    wrapper.unmount()
  })
})

// The Greek row is written (its description) but its name was left empty:
// every place that names the product reads useProductDetail's per-field
// name, so the heading is never blank.
describe.each(trees(ProductDetail, WebsideProductDetail))('$tree ProductDetail name', ({ C }) => {
  it('heads the page with another language\'s name where the page\'s row has none', async () => {
    clearNuxtData()
    clearProductData()
    setTenant({ defaultLocale: 'en', availableLocales: ['el', 'en'] })
    const empty = { count: 0, next: null, previous: null, results: [] }
    api.routes({
      '/api/products/123': makeProduct({
        id: 123,
        translations: {
          el: { name: '', description: '<p>Φορτιστής ταξιδιού</p>', seoTitle: '', seoDescription: '', seoKeywords: '' },
          en: { name: 'Travel charger', description: '', seoTitle: '', seoDescription: '', seoKeywords: '' },
        },
      }),
      '/api/products/123/images': [],
      '/api/products/categories/all': [],
      '/api/products/123/*': empty,
      '/api/*': empty,
    })

    const wrapper = await mountSuspended(C, { route: false })
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('Travel charger')
    wrapper.unmount()
  })
})

// Low stock is the product's own threshold on every store (lowStockLeft);
// each drawing words it in its own copy.
describe.each(trees(ProductDetail, WebsideProductDetail))('$tree ProductDetail stock', ({ tree, C }) => {
  const lowStockOf = (count: number) => (tree === 'default' ? `Έμειναν μόνο ${count}` : `Χαμηλό απόθεμα (${count})`)

  function serve(product: ReturnType<typeof makeProduct>) {
    clearNuxtData()
    clearProductData()
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

  it('reads low stock at or under the product\'s own threshold', async () => {
    serve(makeProduct({ id: 123, stock: 8, lowStockThreshold: 10 }))

    const wrapper = await mountSuspended(C, { route: false })
    await flushPromises()

    expect(wrapper.text()).toContain(lowStockOf(8))
    wrapper.unmount()
  })

  it('reads in stock above it', async () => {
    serve(makeProduct({ id: 123, stock: 12, lowStockThreshold: 10 }))

    const wrapper = await mountSuspended(C, { route: false })
    await flushPromises()

    expect(wrapper.text()).not.toContain(lowStockOf(12))
    expect(wrapper.text()).toContain('Διαθέσιμο')
    wrapper.unmount()
  })
})

// Webside's sticky bar repeats the buy box: the same low-stock reading
// and the price this shopper pays.
describe('webside ProductDetail sticky bar', () => {
  const money = (value: number) => useNuxtApp().$i18n.n(value, 'currency')
  const empty = { count: 0, next: null, previous: null, results: [] }

  async function mountScrolled(product: ReturnType<typeof makeProduct>) {
    clearNuxtData()
    clearProductData()
    setTenant()
    api.routes({
      '/api/products/123': product,
      '/api/products/123/images': [],
      '/api/products/123/*': empty,
      '/api/*': empty,
    })
    windowScrollY.value = 1000
    const wrapper = await mountSuspended(WebsideProductDetail, { route: false })
    await flushPromises()
    return wrapper
  }

  /** The bar: the fixed band that holds the product's name as an h3. */
  const stickyBar = (wrapper: Awaited<ReturnType<typeof mountScrolled>>) =>
    wrapper.findAll('h3').map(h3 => h3.element.closest('.fixed')).find(Boolean)

  it('marks low stock at the product\'s own threshold', async () => {
    const wrapper = await mountScrolled(makeProduct({ id: 123, stock: 8, lowStockThreshold: 10 }))

    expect(stickyBar(wrapper)?.textContent).toContain('Χαμηλό απόθεμα (8)')
    wrapper.unmount()
    windowScrollY.value = 0
  })

  it('shows the price this shopper pays, the wholesale one included', async () => {
    b2bPrice.mockImplementation(id => (id === 123 ? { finalPrice: '40' } : undefined))
    const wrapper = await mountScrolled(makeProduct({ id: 123, price: 50, vatPercent: 24, discountPercent: 0 }))

    expect(stickyBar(wrapper)?.textContent).toContain(money(40))
    expect(stickyBar(wrapper)?.textContent).not.toContain(money(62))
    wrapper.unmount()
    windowScrollY.value = 0
  })
})
