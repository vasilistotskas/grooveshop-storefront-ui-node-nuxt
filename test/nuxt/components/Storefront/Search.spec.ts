import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import Search from '~/components/Storefront/Search.vue'
import {
  makeBlogPostSearchHit,
  makeBlogPostSearchResponse,
  makeProductSearchHit,
  makeProductSearchResponse,
} from '~~/test/fixtures/productFilters'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'

/**
 * The search page keeps its state in the URL (`?query=`, `?tab=`,
 * `?page=`) and runs two searches, each paged on its own: products
 * through `/api/products/search`, guides through
 * `/api/search/blog-posts`. The requests ARE the behaviour, so most
 * cases assert what was asked for; the cards are stubbed (their own
 * specs cover them).
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const { route, navigateToMock } = vi.hoisted(() => ({
  route: { query: {} as Record<string, string> },
  navigateToMock: vi.fn(),
}))
mockNuxtImport('useRoute', () => () => ({
  params: {},
  query: route.query,
  path: '/search',
  fullPath: '/search',
  name: 'search___el',
  hash: '',
  matched: [],
  meta: {},
}))
mockNuxtImport('navigateTo', () => navigateToMock)

const STUBS = {
  ProductCard: { props: ['product'], template: '<li data-test="card">{{ product.name }}</li>' },
  SearchGuideCard: { props: ['post'], emits: ['click'], template: '<a data-test="guide" @click="$emit(\'click\')">{{ post.title }}</a>' },
  ProductCardSkeleton: true,
}

const PRODUCTS = '/api/products/search'
const GUIDES = '/api/search/blog-posts'

interface Answer {
  products?: number
  productTotal?: number
  guides?: number
  guideTotal?: number
  relaxedQuery?: string | null
}

/** What the two searches find; a total defaults to the hits on the page. */
function answer({ products = 2, productTotal, guides = 1, guideTotal, relaxedQuery = null }: Answer = {}) {
  api.routes({
    [PRODUCTS]: makeProductSearchResponse({
      results: Array.from({ length: products }, (_, i) => makeProductSearchHit({ id: i + 1, master: i + 1, name: `Προϊόν ${i + 1}` })),
      estimatedTotalHits: productTotal ?? products,
      relaxedQuery,
    }),
    [GUIDES]: makeBlogPostSearchResponse({
      results: Array.from({ length: guides }, (_, i) => makeBlogPostSearchHit({ id: i + 1, master: i + 1, title: `Οδηγός ${i + 1}` })),
      estimatedTotalHits: guideTotal ?? guides,
    }),
    '/api/search/trending': { windowHours: 24, contentType: 'product', languageCode: 'el', results: [{ query: 'καλώδιο', count: 9 }] },
    '/api/search/click': {},
  })
}

const own = (wrapper: VueWrapper, key: string, params: Record<string, unknown> = {}) =>
  (wrapper.vm as unknown as { t: (k: string, p: Record<string, unknown>) => string }).t(key, params)

const lastQuery = (url: string) => api.callsTo(url).at(-1)?.options.query

async function render(query: Record<string, string>) {
  route.query = query
  const wrapper = await mountSuspended(Search, { route: false, global: { stubs: STUBS } })
  await flushPromises()
  return wrapper
}

describe('Storefront/Search', () => {
  beforeEach(() => {
    clearNuxtData()
    navigateToMock.mockReset()
    setTenant()
    setTenantFeatures({ blog: true })
    answer()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('searches nothing without a query, and asks for one', async () => {
    const wrapper = await render({})

    expect(api.callsTo(PRODUCTS)).toEqual([])
    expect(api.callsTo(GUIDES)).toEqual([])
    expect(wrapper.text()).toContain(own(wrapper, 'start.title'))
  })

  // With no tab named the open tab is not known until the counts are, so
  // the guides search asks for a whole page: whichever tab opens, it has
  // what it shows from the first two requests.
  it('finds products a page at a time and the first few of a page of guides beside them', async () => {
    answer({ guides: 5 })

    const wrapper = await render({ query: 'καλώδιο' })

    expect(lastQuery(PRODUCTS)).toMatchObject({ query: 'καλώδιο', limit: 12, offset: 0 })
    expect(lastQuery(GUIDES)).toMatchObject({ query: 'καλώδιο', limit: 12, offset: 0 })
    expect(wrapper.findAll('[data-test="card"]').map(card => card.text())).toEqual(['Προϊόν 1', 'Προϊόν 2'])
    expect(wrapper.find('aside').findAll('[data-test="guide"]').map(guide => guide.text())).toEqual(['Οδηγός 1', 'Οδηγός 2', 'Οδηγός 3'])
  })

  it('pages the open tab only: guides from their own offset, products from the start', async () => {
    await render({ query: 'καλώδιο', tab: 'guides', page: '2' })

    expect(lastQuery(GUIDES)).toMatchObject({ limit: 12, offset: 12 })
    expect(lastQuery(PRODUCTS)).toMatchObject({ offset: 0 })
  })

  it('keeps the guides beside the products on their first few while the products page on', async () => {
    await render({ query: 'καλώδιο', tab: 'products', page: '3' })

    expect(lastQuery(PRODUCTS)).toMatchObject({ limit: 12, offset: 24 })
    expect(lastQuery(GUIDES)).toMatchObject({ limit: 3, offset: 0 })
  })

  it('finds products alone when the store\'s plan has no blog: no guides asked for, no tab, none beside them', async () => {
    setTenantFeatures({ blog: false })

    const wrapper = await render({ query: 'καλώδιο', tab: 'guides' })

    expect(api.callsTo(GUIDES)).toEqual([])
    expect(lastQuery(PRODUCTS)).toMatchObject({ query: 'καλώδιο', limit: 12, offset: 0 })
    expect(wrapper.findAll('[role="tab"]').map(tab => tab.text())).toEqual([`${own(wrapper, 'tabs.products')}2`])
    expect(wrapper.findAll('[data-test="card"]').map(card => card.text())).toEqual(['Προϊόν 1', 'Προϊόν 2'])
    expect(wrapper.findAll('[data-test="guide"]')).toEqual([])
  })

  it('counts both kinds on their tabs', async () => {
    answer({ products: 2, productTotal: 40, guides: 1, guideTotal: 3 })

    const wrapper = await render({ query: 'καλώδιο' })

    expect(wrapper.findAll('[role="tab"]').map(tab => tab.text())).toEqual([
      `${own(wrapper, 'tabs.products')}40`,
      `${own(wrapper, 'tabs.guides')}3`,
    ])
  })

  it('says when the engine widened a query that matched nothing', async () => {
    answer({ relaxedQuery: 'καλώδιο' })

    const wrapper = await render({ query: 'καλωδιοοο' })

    expect(wrapper.find('[role="status"]').text()).toContain(own(wrapper, 'relaxed', { query: 'καλώδιο' }))
  })

  it('says so when nothing is found', async () => {
    answer({ products: 0, guides: 0 })

    const wrapper = await render({ query: 'xyzzy' })

    expect(wrapper.text()).toContain(own(wrapper, 'empty.title'))
    expect(wrapper.findAll('[data-test="card"]')).toHaveLength(0)
  })

  // 2026-11-13, webside, «security»: 0 products and 4 articles opened on
  // «no results», since the page opened the products whenever the URL named
  // no tab.
  it('opens the guides when only they have results, from the same two requests', async () => {
    answer({ products: 0, guides: 4 })

    const wrapper = await render({ query: 'security' })

    expect(wrapper.get('[role="tab"][aria-selected="true"]').text()).toContain(own(wrapper, 'tabs.guides'))
    expect(wrapper.findAll('[data-test="guide"]').map(guide => guide.text())).toEqual(['Οδηγός 1', 'Οδηγός 2', 'Οδηγός 3', 'Οδηγός 4'])
    expect(wrapper.text()).not.toContain(own(wrapper, 'empty.title'))
    expect(api.callsTo(PRODUCTS)).toHaveLength(1)
    expect(api.callsTo(GUIDES)).toHaveLength(1)
  })

  it('honours a tab the URL names, and with no products there shows the guides beside them at every width', async () => {
    answer({ products: 0, guides: 2 })

    const wrapper = await render({ query: 'security', tab: 'products' })

    expect(wrapper.get('[role="tab"][aria-selected="true"]').text()).toContain(own(wrapper, 'tabs.products'))
    expect(wrapper.text()).toContain(own(wrapper, 'empty_products.title'))
    expect(wrapper.text()).not.toContain(own(wrapper, 'empty.title'))
    const aside = wrapper.get('aside')
    expect(aside.findAll('[data-test="guide"]').map(guide => guide.text())).toEqual(['Οδηγός 1', 'Οδηγός 2'])
    expect(aside.classes()).not.toContain('hidden')
  })

  it('names the open tab in its page links, so a later page pages that list', async () => {
    answer({ products: 0, guides: 12, guideTotal: 30 })

    const wrapper = await render({ query: 'security' })

    const next = wrapper.findAll('a').find(a => a.attributes('href')?.includes('page=2'))
    expect(next?.attributes('href')).toContain('tab=guides')
  })

  it('on a named guides tab with no guides, says so and offers the products rather than an empty list', async () => {
    answer({ products: 2, guides: 0 })

    const wrapper = await render({ query: 'καλώδιο', tab: 'guides' })

    expect(wrapper.text()).toContain(own(wrapper, 'empty_guides.title'))
    expect(wrapper.text()).not.toContain(own(wrapper, 'empty.title'))
    const toProducts = wrapper.findAll('button:not([role="tab"])').find(button => button.text() === own(wrapper, 'empty_guides.show_products'))
    await toProducts?.trigger('click')

    expect(navigateToMock).toHaveBeenCalledWith({ query: { query: 'καλώδιο', tab: 'products' } })
  })

  // A page past the end of a list that has results (an old or edited link)
  // is not an empty tab: it offers that list's first page, never the other
  // tab and never «no products».
  it.each([
    ['products', { products: 0, productTotal: 5, guides: 0 }],
    ['guides', { products: 2, guides: 0, guideTotal: 5 }],
  ] as const)('on a %s page past the end, offers that list\u2019s first page', async (tab, found) => {
    answer(found)

    const wrapper = await render({ query: 'καλώδιο', tab, page: '3' })

    expect(wrapper.text()).toContain(own(wrapper, 'empty_page.title'))
    expect(wrapper.text()).not.toContain(own(wrapper, 'empty_products.title'))
    expect(wrapper.text()).not.toContain(own(wrapper, 'empty_guides.title'))
    const first = wrapper.findAll('a').find(a => a.text() === own(wrapper, 'empty_page.first'))
    expect(first?.attributes('href')).toBe(`/search?query=${encodeURIComponent('καλώδιο')}&tab=${tab}`)
  })

  // A link with a page but no tab (from before the tabs) that opens the
  // guides by their results shows their first page, which is what was
  // fetched: the pagination agrees, and its next page is the second.
  it('shows the first page of guides a tabless link opened, with its pagination on that page', async () => {
    answer({ products: 0, guides: 12, guideTotal: 30 })

    const wrapper = await render({ query: 'security', page: '2' })

    expect(lastQuery(GUIDES)).toMatchObject({ limit: 12, offset: 0 })
    expect(api.callsTo(GUIDES)).toHaveLength(1)
    expect(wrapper.get('a[aria-current="page"]').attributes('href')).toBe('/search?query=security&tab=guides')
    expect(wrapper.get('a[data-slot="next"]').attributes('href')).toBe('/search?query=security&tab=guides&page=2')
  })

  it('links each trending search to its results', async () => {
    const wrapper = await render({})

    const chip = wrapper.findAll('a').find(a => a.text() === 'καλώδιο')
    expect(chip?.attributes('href')).toBe(`/search?query=${encodeURIComponent('καλώδιο')}`)
  })

  it('reports which result was opened, at its place in the whole result set', async () => {
    const wrapper = await render({ query: 'καλώδιο', page: '2' })

    await wrapper.findAll('[data-test="card"]')[1]!.trigger('click')
    await flushPromises()

    expect(api.callsTo('/api/search/click').map(call => call.options.body)).toEqual([{
      queryId: makeProductSearchResponse().queryId,
      resultId: '2',
      resultType: 'product',
      position: 13,
    }])
  })

  it('moves the query to the URL a beat after typing stops, in place', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const wrapper = await render({ query: 'καλ' })

    await wrapper.find('input').setValue('καλώδιο usb')
    await vi.advanceTimersByTimeAsync(299)
    expect(navigateToMock).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)

    expect(navigateToMock).toHaveBeenCalledExactlyOnceWith({ query: { query: 'καλώδιο usb' } }, { replace: true })
  })
})
