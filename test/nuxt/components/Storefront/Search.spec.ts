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

  it('finds products a page at a time and the first few guides beside them', async () => {
    const wrapper = await render({ query: 'καλώδιο' })

    expect(lastQuery(PRODUCTS)).toMatchObject({ query: 'καλώδιο', limit: 12, offset: 0 })
    expect(lastQuery(GUIDES)).toMatchObject({ query: 'καλώδιο', limit: 3, offset: 0 })
    expect(wrapper.findAll('[data-test="card"]').map(card => card.text())).toEqual(['Προϊόν 1', 'Προϊόν 2'])
    expect(wrapper.find('aside').findAll('[data-test="guide"]').map(guide => guide.text())).toEqual(['Οδηγός 1'])
  })

  it('pages the open tab only: guides from their own offset, products from the start', async () => {
    await render({ query: 'καλώδιο', tab: 'guides', page: '2' })

    expect(lastQuery(GUIDES)).toMatchObject({ limit: 12, offset: 12 })
    expect(lastQuery(PRODUCTS)).toMatchObject({ offset: 0 })
  })

  it('keeps the guides beside the products on their first few while the products page on', async () => {
    await render({ query: 'καλώδιο', page: '3' })

    expect(lastQuery(PRODUCTS)).toMatchObject({ limit: 12, offset: 24 })
    expect(lastQuery(GUIDES)).toMatchObject({ limit: 3, offset: 0 })
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
