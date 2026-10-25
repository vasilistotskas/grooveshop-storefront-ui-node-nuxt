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

function answer({ productTotal = 2, guideTotal = 1 } = {}) {
  api.routes({
    [PRODUCTS]: makeProductSearchResponse({
      results: [1, 2].map(i => makeProductSearchHit({ id: i, master: i, name: `Προϊόν ${i}` })),
      estimatedTotalHits: productTotal,
    }),
    [GUIDES]: makeBlogPostSearchResponse({
      results: [makeBlogPostSearchHit({ id: 1, master: 1, title: 'Άρθρο 1' })],
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

  it('lists products a page at a time and counts the articles without fetching them', async () => {
    const wrapper = await render({ query: 'καλώδιο', page: '2' })

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
    expect(hrefs).toContain(`/search?query=${encodeURIComponent('καλώδιο')}&page=2`)
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
