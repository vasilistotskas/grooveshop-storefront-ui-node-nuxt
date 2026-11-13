import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import Search from '~/components/variants/webside/Storefront/Search.vue'
import {
  makeBlogPostSearchHit,
  makeBlogPostSearchResponse,
  makeProductSearchHit,
  makeProductSearchResponse,
} from '~~/test/fixtures/productFilters'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'

/**
 * Webside's search page draws its own look over the platform's searches
 * (`useStorefrontSearch`, the default page's too): products through
 * `/api/products/search`, articles through `/api/search/blog-posts`, the
 * state in the URL. On the products tab the articles search asks for
 * none, only their count for the tab. The result cards are stubbed.
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
  WebsideSearchResult: {
    props: ['result'],
    emits: ['click'],
    template: '<a data-test="result" @click="$emit(\'click\')">{{ result.name ?? result.title }}</a>',
  },
}

const PRODUCTS = '/api/products/search'
const GUIDES = '/api/search/blog-posts'

/** What the two searches find; the products' total defaults to the hits on the page. */
function answer({ products = 2, productTotal, guides = 1, guideTotal = 1 }: { products?: number, productTotal?: number, guides?: number, guideTotal?: number } = {}) {
  api.routes({
    [PRODUCTS]: makeProductSearchResponse({
      results: Array.from({ length: products }, (_, i) => makeProductSearchHit({ id: i + 1, master: i + 1, name: `Προϊόν ${i + 1}` })),
      estimatedTotalHits: productTotal ?? products,
    }),
    [GUIDES]: makeBlogPostSearchResponse({
      results: Array.from({ length: guides }, (_, i) => makeBlogPostSearchHit({ id: i + 1, master: i + 1, title: `Άρθρο ${i + 1}` })),
      estimatedTotalHits: guideTotal,
    }),
    '/api/search/click': {},
  })
}

const own = (wrapper: VueWrapper, key: string) =>
  (wrapper.vm as unknown as { t: (k: string) => string }).t(key)

const lastQuery = (url: string) => api.callsTo(url).at(-1)?.options.query

async function render(query: Record<string, string>) {
  route.query = query
  const wrapper = await mountSuspended(Search, { route: false, global: { stubs: STUBS } })
  await flushPromises()
  return wrapper
}

describe('webside Storefront/Search', () => {
  beforeEach(() => {
    clearNuxtData()
    navigateToMock.mockReset()
    setTenant()
    setTenantFeatures({ blog: true })
    answer()
  })

  it('searches nothing without a query', async () => {
    const wrapper = await render({})

    expect(api.callsTo(PRODUCTS)).toEqual([])
    expect(api.callsTo(GUIDES)).toEqual([])
    expect(wrapper.text()).toContain(own(wrapper, 'page.empty.title'))
  })

  it('lists products a page at a time and, on their named tab, counts the articles without fetching them', async () => {
    const wrapper = await render({ query: 'καλώδιο', tab: 'products', page: '2' })

    expect(lastQuery(PRODUCTS)).toMatchObject({ query: 'καλώδιο', limit: 12, offset: 12 })
    expect(lastQuery(GUIDES)).toMatchObject({ query: 'καλώδιο', limit: 0, offset: 0 })
    expect(wrapper.findAll('[data-test="result"]').map(result => result.text())).toEqual(['Προϊόν 1', 'Προϊόν 2'])
  })

  it('lists articles on their own tab, paged from their own offset', async () => {
    const wrapper = await render({ query: 'καλώδιο', tab: 'guides', page: '2' })

    expect(lastQuery(GUIDES)).toMatchObject({ limit: 12, offset: 12 })
    expect(lastQuery(PRODUCTS)).toMatchObject({ offset: 0 })
    expect(wrapper.findAll('[data-test="result"]').map(result => result.text())).toEqual(['Άρθρο 1'])
  })

  it('counts both kinds on their tabs', async () => {
    answer({ productTotal: 40, guideTotal: 3 })

    const wrapper = await render({ query: 'καλώδιο' })

    expect(wrapper.findAll('[role="tab"]').map(tab => tab.text())).toEqual([
      `${own(wrapper, 'page.tabs.products_label')}40`,
      `${own(wrapper, 'page.tabs.blog_posts_label')}3`,
    ])
  })

  it('asks for no articles and shows no articles tab when the store has no blog', async () => {
    setTenantFeatures({ blog: false })

    const wrapper = await render({ query: 'καλώδιο', tab: 'guides' })

    expect(api.callsTo(GUIDES)).toEqual([])
    expect(wrapper.findAll('[role="tab"]').map(tab => tab.text())).toEqual([`${own(wrapper, 'page.tabs.products_label')}2`])
    expect(wrapper.findAll('[data-test="result"]').map(result => result.text())).toEqual(['Προϊόν 1', 'Προϊόν 2'])
  })

  it('opens a tab through the URL, back on its first page', async () => {
    const wrapper = await render({ query: 'καλώδιο', page: '3' })

    await wrapper.findAll('[role="tab"]')[1]!.trigger('mousedown', { button: 0 })
    await flushPromises()

    expect(navigateToMock).toHaveBeenCalledWith({ query: { query: 'καλώδιο', tab: 'guides' } })
  })

  it('links each page of results', async () => {
    answer({ productTotal: 40 })

    const wrapper = await render({ query: 'καλώδιο' })

    const hrefs = wrapper.findAll('a').map(a => a.attributes('href')).filter(href => href?.includes('page='))
    expect(hrefs).toContain(`/search?query=${encodeURIComponent('καλώδιο')}&tab=products&page=2`)
  })

  // 2026-11-13, webside.gr/search?query=security: 0 products, 4 articles,
  // and the page said «no results».
  it('opens the articles when only they have results', async () => {
    answer({ products: 0, guideTotal: 4 })

    const wrapper = await render({ query: 'security' })

    expect(wrapper.get('[role="tab"][aria-selected="true"]').text()).toContain(own(wrapper, 'page.tabs.blog_posts_label'))
    expect(wrapper.findAll('[data-test="result"]').map(result => result.text())).toEqual(['Άρθρο 1'])
    expect(lastQuery(GUIDES)).toMatchObject({ limit: 12, offset: 0 })
    expect(wrapper.text()).not.toContain(own(wrapper, 'page.no_results.title'))
  })

  it('on a named products tab with no products, says so and offers the articles rather than «no results»', async () => {
    answer({ products: 0, guideTotal: 4 })

    const wrapper = await render({ query: 'security', tab: 'products' })

    expect(wrapper.text()).toContain(own(wrapper, 'page.open_empty.products'))
    expect(wrapper.text()).not.toContain(own(wrapper, 'page.no_results.title'))
    const toArticles = wrapper.findAll('button:not([role="tab"])').find(button => button.text().includes('4'))
    expect(toArticles?.text()).toMatch(/4/)
    await toArticles?.trigger('click')

    expect(navigateToMock).toHaveBeenCalledWith({ query: { query: 'security', tab: 'guides' } })
  })

  it('says «no results» only when neither list has any', async () => {
    answer({ products: 0, guideTotal: 0 })

    const wrapper = await render({ query: 'xyzzy' })

    expect(wrapper.text()).toContain(own(wrapper, 'page.no_results.title'))
  })

  // A page past the end of a list that has results (an old or edited link)
  // is not an empty tab: it offers that list's first page, never the other
  // tab (here there are no articles, or no blog at all) and never «no products».
  it.each([
    ['with no articles', true],
    ['without the blog', false],
  ])('on a products page past the end %s, offers the first page of products', async (_case, blog) => {
    setTenantFeatures({ blog })
    answer({ products: 0, productTotal: 5, guides: 0, guideTotal: 0 })

    const wrapper = await render({ query: 'καλώδιο', tab: 'products', page: '3' })

    expect(wrapper.text()).toContain(own(wrapper, 'page.empty_page.title'))
    expect(wrapper.text()).not.toContain(own(wrapper, 'page.open_empty.products'))
    expect(wrapper.text()).not.toContain(own(wrapper, 'page.no_results.title'))
    expect(wrapper.findAll('button:not([role="tab"])').map(button => button.text()).join(' ')).not.toMatch(/0/)
    const first = wrapper.findAll('a').find(a => a.text() === own(wrapper, 'page.empty_page.first'))
    expect(first?.attributes('href')).toBe(`/search?query=${encodeURIComponent('καλώδιο')}&tab=products`)
  })

  it('on an articles page past the end, offers the first page of articles', async () => {
    answer({ products: 2, guides: 0, guideTotal: 5 })

    const wrapper = await render({ query: 'καλώδιο', tab: 'guides', page: '3' })

    expect(wrapper.text()).toContain(own(wrapper, 'page.empty_page.title'))
    expect(wrapper.text()).not.toContain(own(wrapper, 'page.open_empty.guides'))
    const first = wrapper.findAll('a').find(a => a.text() === own(wrapper, 'page.empty_page.first'))
    expect(first?.attributes('href')).toBe(`/search?query=${encodeURIComponent('καλώδιο')}&tab=guides`)
  })

  // A link with a page but no tab (from before the tabs) that opens the
  // articles by their results shows their first page, which is what was
  // fetched: the pagination agrees, and its next page is the second.
  it('shows the first page of articles a tabless link opened, with its pagination on that page', async () => {
    answer({ products: 0, guides: 12, guideTotal: 30 })

    const wrapper = await render({ query: 'security', page: '2' })

    expect(lastQuery(GUIDES)).toMatchObject({ limit: 12, offset: 0 })
    expect(api.callsTo(GUIDES)).toHaveLength(1)
    expect(wrapper.get('a[aria-current="page"]').attributes('href')).toBe('/search?query=security&tab=guides')
    expect(wrapper.get('a[data-slot="next"]').attributes('href')).toBe('/search?query=security&tab=guides&page=2')
  })

  it('reports which result was opened, at its place in the whole result set', async () => {
    const wrapper = await render({ query: 'καλώδιο', page: '2' })

    await wrapper.findAll('[data-test="result"]')[1]!.trigger('click')
    await flushPromises()

    expect(api.callsTo('/api/search/click').map(call => call.options.body)).toEqual([{
      queryId: makeProductSearchResponse().queryId,
      resultId: '2',
      resultType: 'product',
      position: 13,
    }])
  })
})
