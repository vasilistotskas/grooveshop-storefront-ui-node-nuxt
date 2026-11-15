import { describe, it, expect, vi, beforeEach, onTestFinished } from 'vitest'
import type { ProductAttribute, PublicValues } from '~~/shared/openapi/types.gen'
import { mountSuspended, mockComponent, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { el as uiLocale } from '@nuxt/ui/locale'
import ProductDetail from '~/components/Storefront/ProductDetail.vue'
import WebsideProductDetail from '~/components/variants/webside/Storefront/ProductDetail.vue'
import PriorPrice from '~/components/Product/PriorPrice.vue'
import { makeProduct, makeProductReview } from '~~/test/fixtures/product'
import { makePublicValues } from '~~/test/fixtures/publicValues'
import { makeCategory } from '~~/test/fixtures/productFilters'
import { setTenant, setTenantFeatures, setTenantPreferences } from '~~/test/helpers/tenant'
import { trees } from '~~/test/helpers/trees'
import { inlineCopy, inlineT } from '~~/test/helpers/inlineCopy'

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

// A phone renders the product sections as an accordion, a desktop
// (default) design as tabs; the device is the request's User-Agent.
const { device } = vi.hoisted(() => ({ device: { mobileOrTablet: false } }))
mockNuxtImport('useDevice', () => () => ({ isMobileOrTablet: device.mobileOrTablet }))

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
      '/api/shipping/policy': [],
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
      '/api/shipping/policy': [],
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
      '/api/shipping/policy': [],
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
mockNuxtImport('defineBreadcrumb', () => (input: unknown) => ({ breadcrumb: input }))
mockNuxtImport('defineWebPage', () => (input: unknown) => ({ webPage: input }))

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
      '/api/shipping/policy': [],
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

/**
 * Where the product sits, in every design: the breadcrumb a shopper sees,
 * the BreadcrumbList and the Product's category are one trail, Home ›
 * the category's ancestors › the category › the product's NAME (never
 * its SEO title, which carries the store's suffix). The page's primary
 * image is the product's first photograph, not the store's logo.
 */
describe.each([
  ['default', ProductDetail],
  ['webside', WebsideProductDetail],
])('ProductDetail category trail (%s tree)', (_tree, Component) => {
  const empty = { count: 0, next: null, previous: null, results: [] }
  const CATEGORIES = [
    makeCategory({ id: 1, name: { el: 'Φόρτιση', en: 'Charging' } }),
    makeCategory({ id: 2, name: { el: 'Power banks', en: 'Power banks' }, parent: 1, level: 1 }),
  ]

  function serve(product: ReturnType<typeof makeProduct>, images: unknown[] = []) {
    clearNuxtData(['product123', 'productImages123', 'productReviewsSchema123', 'all-categories'])
    setTenant({ assetsDomain: 'assets.shop.test' })
    schemaNodes.length = 0
    api.routes({
      '/api/products/123': product,
      '/api/products/123/images': images,
      '/api/products/categories/all': CATEGORIES,
      '/api/products/123/*': empty,
      '/api/shipping/policy': [],
      '/api/*': empty,
    })
  }

  const mountPage = async () => {
    const wrapper = await mountSuspended(Component, { route: false })
    await flushPromises()
    return wrapper
  }
  const crumbsOf = (wrapper: Awaited<ReturnType<typeof mountPage>>) =>
    wrapper.get(`nav[aria-label="${uiLocale.messages.breadcrumb.label}"]`).findAll('li').map(li => li.text()).filter(Boolean)
  const schemaTrail = () => (schemaNodes.find(n => (n as { breadcrumb?: unknown }).breadcrumb) as { breadcrumb: { value: { itemListElement: { name: string }[] } } })
    .breadcrumb.value.itemListElement.map(item => item.name)
  const schemaCategory = () => (schemaNodes.find(n => (n as { product?: unknown }).product) as { product: { value: { category?: string } } }).product.value.category

  // A store's SEO title carries its suffix; the trail names the product.
  const product = (category: number | null) => makeProduct({
    id: 123,
    category,
    translations: { el: { name: 'Προϊόν 123', description: '', seoTitle: 'Προϊόν 123 | Κατάστημα', seoDescription: '', seoKeywords: '' } },
  })

  it('places the product under its category trail, on the page and in the structured data', async () => {
    serve(product(2))
    const wrapper = await mountPage()

    expect(crumbsOf(wrapper)).toEqual(['Αρχική', 'Φόρτιση', 'Power banks', 'Προϊόν 123'])
    expect(schemaTrail()).toEqual(['Αρχική', 'Φόρτιση', 'Power banks', 'Προϊόν 123'])
    // Google reads a category as its trail by name; the id said nothing.
    expect(schemaCategory()).toBe('Φόρτιση > Power banks')
  })

  it.each([
    ['without a category', null],
    ['outside the catalogue tree', 99],
  ])('places a product %s under the full listing', async (_case, category) => {
    serve(product(category))
    const wrapper = await mountPage()

    expect(crumbsOf(wrapper)).toEqual(['Αρχική', 'Προϊόντα', 'Προϊόν 123'])
    expect(schemaTrail()).toEqual(['Αρχική', 'Προϊόντα', 'Προϊόν 123'])
    expect(schemaCategory()).toBeUndefined()
  })

  it('names the first photograph as the primary image of the page', async () => {
    serve(product(2), [
      { id: 1, mainImagePath: 'media/acme/uploads/products/a.jpg', image: 'https://static.platform.test/media/acme/uploads/products/a.jpg' },
      { id: 2, mainImagePath: 'media/acme/uploads/products/b.png', image: 'https://static.platform.test/media/acme/uploads/products/b.png' },
    ])
    await mountPage()

    const page = schemaNodes.find(n => (n as { webPage?: unknown }).webPage) as { webPage: { value: { primaryImageOfPage?: string } } }
    expect(page.webPage.value.primaryImageOfPage)
      .toBe('https://assets.shop.test/media_stream-image/media/acme/uploads/products/a.jpg/1000/1000/contain/center/FFFFFF/5/85.jpeg')
  })
})

describe('default ProductDetail', () => {
  /** The default design's word for a product that cannot be bought, from the button's own `<i18n>` block. */
  const UNAVAILABLE = inlineCopy('app/components/Button/Product/AddToCart.vue').unavailable
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
    values: Partial<PublicValues> = {},
  ) {
    clearNuxtData()
    setTenant()
    api.routes({
      '/api/products/123': { ...product, ratingDistribution },
      '/api/products/123/images': [],
      '/api/products/categories/all': CATEGORIES,
      '/api/settings/public': { settings: {}, values: makePublicValues(values) },
      '/api/products/123/reviews': (_url: string, options?: { query?: { page?: number } }) => reviews(options?.query?.page ?? 1),
      '/api/products/123/*': empty,
      '/api/shipping/policy': [],
      '/api/*': empty,
    })
  }

  const mountPage = async () => {
    const wrapper = await mountSuspended(ProductDetail, { route: false })
    await flushPromises()
    return wrapper
  }

  it.each([
    { stock: 40, line: 'Διαθέσιμο' },
    { stock: 3, line: 'Έμειναν μόνο 3' },
    { stock: 0, line: 'Εξαντλήθηκε' },
  ])('says $line for a stock of $stock', async ({ stock, line }) => {
    serve(makeProduct({ id: 123, stock, lowStockThreshold: 5 }))
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

  it('draws no quantity for a sold-out product, and its button says so in full', async () => {
    serve(makeProduct({ id: 123, stock: 0 }))
    const wrapper = await mountPage()
    const button = wrapper.findAll('button').find(b => b.text() === UNAVAILABLE)!

    expect(wrapper.find('#quantity').exists()).toBe(false)
    expect(button.find('[data-slot="label"]').classes()).not.toContain('truncate')
  })

  // The buy box's own button: the sticky bar's is not 52px tall.
  const buyBoxButton = (wrapper: Awaited<ReturnType<typeof mountPage>>) =>
    wrapper.findAll('button').find(b => b.classes().includes('min-h-13'))!

  it('gives the add button a row of its own on a phone when there is a quantity beside it', async () => {
    serve(makeProduct({ id: 123, stock: 5 }))

    expect(buyBoxButton(await mountPage()).classes()).toEqual(expect.arrayContaining(['max-sm:basis-full', 'max-sm:order-last']))
  })

  it('leaves the sold-out button beside the favourite, with the whole row', async () => {
    serve(makeProduct({ id: 123, stock: 0 }))

    expect(buyBoxButton(await mountPage()).classes()).not.toContain('max-sm:basis-full')
  })

  it('draws the quantity for a product in stock', async () => {
    serve(makeProduct({ id: 123, stock: 5 }))
    const wrapper = await mountPage()

    expect(wrapper.find('#quantity').exists()).toBe(true)
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

  function serve(values: Partial<PublicValues> = {}) {
    clearNuxtData()
    setTenant()
    api.routes({
      '/api/products/123': { ...makeProduct({ id: 123, reviewAverage: 8.6, reviewCount: 14 }), ratingDistribution: [{ rate: 10, count: 14 }] },
      '/api/products/123/images': [],
      '/api/products/categories/all': [],
      '/api/settings/public': { settings: {}, values: makePublicValues(values) },
      '/api/products/123/reviews': (_url: string, options?: { query?: { page?: number } }) => reviews(options?.query?.page ?? 1),
      '/api/products/123/*': empty,
      '/api/shipping/policy': [],
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
    // Named by the text on screen (WCAG 2.5.3), with "out of 5" added for a screen reader.
    expect(link.text()).toBe('4,3 · 14 αξιολογήσεις, βαθμολογία στα 5')
    expect(link.attributes('aria-label')).toBeUndefined()
    // The model's own 1..10 scale never reaches a reader.
    expect(wrapper.get('#reviews').text()).not.toMatch(/\/\s*10/)
  })

  it('invites a guest to sign in to write one', async () => {
    serve()
    const wrapper = await mountPage()

    expect(wrapper.get('#reviews').text()).toContain('Συνδέσου για να γράψεις κριτική')
  })

  it('asks for no reviews, and shows no rating or section, when the store has reviews off', async () => {
    serve()
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
      '/api/settings/public': { settings: {}, values: makePublicValues() },
      '/api/products/123/*': empty,
      '/api/shipping/policy': [],
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
  // webside copy with a line-through span.
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
      '/api/shipping/policy': [],
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
      '/api/shipping/policy': [],
      '/api/*': empty,
    })

    const wrapper = await mountSuspended(C, { route: false })
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('Travel charger')
    wrapper.unmount()
  })
})

// Product.category is SET_NULL in Django: a product whose category was
// deleted is served with `category: null`, and both designs render it.
describe.each(trees(ProductDetail, WebsideProductDetail))('$tree ProductDetail without a category', ({ C }) => {
  it('renders the product', async () => {
    clearNuxtData()
    clearProductData()
    setTenant()
    const empty = { count: 0, next: null, previous: null, results: [] }
    api.routes({
      '/api/products/123': makeProduct({ id: 123, category: null }),
      '/api/products/123/images': [],
      '/api/products/categories/all': [],
      '/api/products/123/*': empty,
      '/api/shipping/policy': [],
      '/api/*': empty,
    })

    const wrapper = await mountSuspended(C, { route: false })
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('Προϊόν 123')
    wrapper.unmount()
  })
})

// Low stock is the product's own threshold on every store (lowStockLeft);
// each drawing words it in its own copy.
describe.each(trees(ProductDetail, WebsideProductDetail))('$tree ProductDetail stock', ({ tree, C }) => {
  const pageT = inlineT(tree === 'default' ? 'app/components/Storefront/ProductDetail.vue' : 'app/components/variants/webside/Storefront/ProductDetail.vue')
  const lowStockOf = (count: number) => pageT('low_stock', { count }, count)
  const SOLD_OUT = pageT('out_of_stock')

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
      '/api/shipping/policy': [],
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

  it('reads in stock, however few are left, when the threshold is 0: the store switched the hint off', async () => {
    serve(makeProduct({ id: 123, stock: 3, lowStockThreshold: 0 }))

    const wrapper = await mountSuspended(C, { route: false })
    await flushPromises()

    expect(wrapper.text()).not.toContain(lowStockOf(3))
    expect(wrapper.text()).toContain('Διαθέσιμο')
    wrapper.unmount()
  })

  // A product that cannot be bought gets no quantity control, in the buy
  // box or in webside's sticky bar (shown once the page has scrolled past
  // the buy box): a disabled stepper is a control with nothing to do.
  it.each([
    { stock: 0, drawn: false },
    { stock: 5, drawn: true },
  ])('draws a quantity control only for a product it sells (stock $stock)', async ({ stock, drawn }) => {
    serve(makeProduct({ id: 123, stock }))
    setTenantPreferences({ stickyAddToCart: true })
    // Past the buy box: the sticky bar shows from 350px down.
    windowScrollY.value = 1000
    onTestFinished(() => {
      windowScrollY.value = 0
    })

    const wrapper = await mountSuspended(C, { route: false })
    await flushPromises()

    expect(wrapper.find('[data-action-bar], [data-dock="bar"]').exists()).toBe(true)
    expect(wrapper.find('#quantity').exists()).toBe(drawn)
    // Nuxt UI's stepper in the buy box, and webside's sticky bar's own.
    const { increment, decrement } = uiLocale.messages.inputNumber
    const websideCopy = inlineCopy('app/components/variants/webside/Storefront/ProductDetail.vue')
    const sticky = [websideCopy.decrease_quantity, websideCopy.increase_quantity]
    const steppers = wrapper.findAll('button').map(button => button.attributes('aria-label')).filter(label => [increment, decrement, ...sticky].includes(label ?? ''))
    expect(steppers).toEqual(drawn
      ? (tree === 'default' ? [increment, decrement] : [increment, decrement, ...sticky])
      : [])
    wrapper.unmount()
  })

  it('reads sold out, never low stock, at stock 0', async () => {
    serve(makeProduct({ id: 123, stock: 0, lowStockThreshold: 5 }))

    const wrapper = await mountSuspended(C, { route: false })
    await flushPromises()

    expect(wrapper.text()).not.toContain(lowStockOf(0))
    expect(wrapper.text()).toContain(SOLD_OUT)
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
      '/api/products/categories/all': [],
      '/api/products/123/*': empty,
      '/api/shipping/policy': [],
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

/**
 * A browse-only store (catalogue on, cart off) takes no orders, so the
 * page offers nothing to buy: no quantity, no add-to-cart, no sticky buy
 * bar. The price and the product stay. Both trees apply the one rule.
 */
describe.each(trees(ProductDetail, WebsideProductDetail))('$tree ProductDetail buying controls', ({ tree, C }) => {
  const money = (value: number) => useNuxtApp().$i18n.n(value, 'currency')
  const empty = { count: 0, next: null, previous: null, results: [] }
  // The page names its buy button in its own words (`<i18n>` block).
  const buyLabel = inlineCopy(tree === 'default' ? 'app/components/Storefront/ProductDetail.vue' : 'app/components/variants/webside/Storefront/ProductDetail.vue').add_to_cart

  async function mountPage(features: { cart: boolean }) {
    clearNuxtData()
    clearProductData()
    setTenant()
    setTenantFeatures(features)
    api.routes({
      '/api/products/123': makeProduct({ id: 123, price: 50, vatPercent: 24, discountPercent: 0 }),
      '/api/products/123/images': [],
      '/api/products/categories/all': [],
      '/api/products/123/*': empty,
      '/api/shipping/policy': [],
      '/api/*': empty,
    })
    windowScrollY.value = 1000
    const wrapper = await mountSuspended(C, { route: false })
    await flushPromises()
    return wrapper
  }

  const buyButtons = (wrapper: Awaited<ReturnType<typeof mountPage>>) =>
    wrapper.findAll('button').filter(button => button.attributes('aria-label') === buyLabel)

  it('offers a quantity and an add-to-cart button when the store has a cart', async () => {
    const wrapper = await mountPage({ cart: true })

    expect(wrapper.find('#quantity').exists()).toBe(true)
    expect(buyButtons(wrapper).length).toBeGreaterThan(0)
    wrapper.unmount()
    windowScrollY.value = 0
  })

  it('offers nothing to buy when the store has no cart, and still shows the price', async () => {
    const wrapper = await mountPage({ cart: false })

    expect(wrapper.find('#quantity').exists()).toBe(false)
    expect(buyButtons(wrapper)).toHaveLength(0)
    expect(wrapper.text()).toContain(money(62))
    wrapper.unmount()
    windowScrollY.value = 0
  })

  // The webside page shows its bar once the window has scrolled; the bar
  // is the fixed band holding the product's name as an h3.
  it.runIf(tree === 'webside').each([{ cart: true, drawn: true }, { cart: false, drawn: false }])(
    'draws the sticky buy bar: $drawn when the cart is $cart',
    async ({ cart, drawn }) => {
      const wrapper = await mountPage({ cart })

      const bar = wrapper.findAll('h3').map(h3 => h3.element.closest('.fixed')).find(Boolean)
      expect(bar !== undefined).toBe(drawn)
      wrapper.unmount()
      windowScrollY.value = 0
    },
  )

  it.runIf(tree === 'default')('does not reserve room for a sticky buy bar the store never draws', async () => {
    const wrapper = await mountPage({ cart: false })

    expect(wrapper.find('[data-action-bar]').exists()).toBe(false)
    wrapper.unmount()
  })
})

// The purchase assurances under the buy button (`useProductAssurances`), in
// both designs. They state the free-shipping threshold, so the notice that
// states the same one stands aside; with the box off, the notice stays. The
// default page draws the notice on the client only (it is per visitor), so
// that half is asserted on webside's, which draws it in the render.
describe.each(trees(ProductDetail, WebsideProductDetail))('$tree ProductDetail purchase assurances', ({ tree, C, own }) => {
  const NOTICE = own('ShippingFreeShippingNotice')

  function serve() {
    clearNuxtData()
    clearProductData()
    clearNuxtData(['shipping-policy', 'shipping:free-shipping-info', 'footer-pay-ways', 'store-settings'])
    const empty = { count: 0, next: null, previous: null, results: [] }
    api.routes({
      '/api/products/123': makeProduct({ id: 123 }),
      '/api/products/123/images': [],
      '/api/products/categories/all': [],
      '/api/products/123/*': empty,
      '/api/shipping/policy': [
        { countryCode: 'GR', kind: 'home', providerCode: 'acs', providerName: 'ACS', price: 3, currency: 'EUR', freeShippingThreshold: 40, deliveryDaysMin: 1, deliveryDaysMax: 3, maxWeightGrams: null },
      ],
      '/api/shipping/free-shipping-info': { providers: [], minThreshold: 40, maxThreshold: 40, currency: 'EUR', countryCode: 'GR' },
      '/api/pay-way': { ...empty, results: [{ settlement: 'online' }, { settlement: 'courier_cash' }] },
      '/api/settings/public': { settings: {}, values: makePublicValues({ returnWindowDays: 14 }) },
      '/api/*': empty,
    })
  }

  beforeEach(() => {
    setTenant()
  })

  it('states delivery, payment and returns under the buy button', async () => {
    serve()

    const wrapper = await mountSuspended(C, { route: false })
    await flushPromises()

    const box = wrapper.get('ul[aria-label]')
    expect(box.text()).toContain('Παράδοση σε 1–3 εργάσιμες ημέρες')
    expect(box.text()).toContain('Κάρτα ή αντικαταβολή')
    expect(box.text()).toContain('Επιστροφή εντός 14 ημερών')
    wrapper.unmount()
  })

  it.runIf(tree === 'webside')('stands in for the free-shipping notice, which would state the same threshold', async () => {
    serve()

    const wrapper = await mountSuspended(C, { route: false })
    await flushPromises()

    expect(wrapper.findComponent({ name: NOTICE }).exists()).toBe(false)
    wrapper.unmount()
  })

  it('draws no box when the store turned it off', async () => {
    serve()
    setTenantPreferences({ productAssurances: false })

    const wrapper = await mountSuspended(C, { route: false })
    await flushPromises()

    expect(wrapper.find('ul[aria-label]').exists()).toBe(false)
    wrapper.unmount()
  })

  it.runIf(tree === 'webside')('leaves the free-shipping notice in place when the box is off', async () => {
    serve()
    setTenantPreferences({ productAssurances: false })

    const wrapper = await mountSuspended(C, { route: false })
    await flushPromises()

    expect(wrapper.findComponent({ name: NOTICE }).exists()).toBe(true)
    wrapper.unmount()
  })
})

/**
 * "Order before 15:00, it ships the same business day": the store's cutoff
 * from the typed settings, in both designs, only for a product that has
 * stock to dispatch.
 */
describe.each(trees(ProductDetail, WebsideProductDetail))('$tree ProductDetail dispatch cutoff', ({ C }) => {
  const PROMISE = 'αποστέλλεται την ίδια εργάσιμη'

  function serve(stock: number, values: Partial<PublicValues>) {
    clearNuxtData()
    setTenant()
    const empty = { count: 0, next: null, previous: null, results: [] }
    api.routes({
      '/api/products/123': { ...makeProduct({ id: 123, stock }), ratingDistribution: [] },
      '/api/products/123/images': [],
      '/api/products/categories/all': [],
      '/api/settings/public': { settings: {}, values: makePublicValues(values) },
      '/api/products/123/*': empty,
      '/api/shipping/policy': [],
      '/api/*': empty,
    })
  }

  const mountPage = async () => {
    const wrapper = await mountSuspended(C, { route: false })
    await flushPromises()
    return wrapper
  }

  it('promises same-business-day dispatch before the cutoff the store set', async () => {
    serve(20, { dispatchCutoff: '15:00' })

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Παράγγειλε πριν τις 15:00 (ώρα Ελλάδας) και αποστέλλεται την ίδια εργάσιμη')
  })

  it.each([
    ['sets no cutoff', { dispatchCutoff: '' }, 20],
    ['writes a cutoff that is no clock time', { dispatchCutoff: 'before lunch' }, 20],
    ['has the product sold out', { dispatchCutoff: '15:00' }, 0],
  ])('promises no dispatch when the store %s', async (_name, values, stock) => {
    serve(stock, values)

    const wrapper = await mountPage()

    expect(wrapper.text()).not.toContain(PROMISE)
  })
})

/**
 * The specifications are part of the page's HTML on every device, closed
 * tab or not: search engines and the page's .md twin read them from it.
 * Webside opens both sections by default (the store's request, 2026-11-03).
 */
describe.each([
  ['default', ProductDetail],
  ['webside', WebsideProductDetail],
])('ProductDetail specifications (%s tree)', (tree, Component) => {
  const empty = { count: 0, next: null, previous: null, results: [] }
  const capacity: ProductAttribute = {
    id: 1,
    attributeId: 7,
    attributeName: 'Χωρητικότητα',
    isVariant: false,
    schemaProperty: '',
    attributeValueId: 70,
    value: '5000 mAh',
    createdAt: '2026-01-01T00:00:00Z',
  }

  beforeEach(() => {
    clearNuxtData()
    setTenant()
    api.routes({
      '/api/products/123': makeProduct({ id: 123, attributes: [capacity] }),
      '/api/products/123/images': [],
      '/api/products/categories/all': [],
      '/api/products/123/*': empty,
      '/api/shipping/policy': [],
      '/api/*': empty,
    })
  })

  it.each([
    ['desktop', false],
    ['phone', true],
  ])('renders the specifications on a %s', async (_device, mobileOrTablet) => {
    device.mobileOrTablet = mobileOrTablet
    const wrapper = await mountSuspended(Component, { route: false })
    await flushPromises()

    // The default design draws a table row (th + td), webside a dl (dt + dd).
    const spec = wrapper.findAll('th, dt').find(term => term.text() === capacity.attributeName)
    expect(spec?.element.nextElementSibling?.textContent?.trim()).toBe(capacity.value)
  })

  it.runIf(tree === 'webside')('opens the description and the specifications', async () => {
    device.mobileOrTablet = false
    const wrapper = await mountSuspended(Component, { route: false })
    await flushPromises()

    // Webside's own labels (its Greek-only <i18n> block).
    const sections = ['Περιγραφή', 'Προδιαγραφές'].map(label =>
      wrapper.findAll('button[aria-expanded]').find(button => button.text() === label)?.attributes('aria-expanded'))
    expect(sections).toEqual(['true', 'true'])
  })
})
