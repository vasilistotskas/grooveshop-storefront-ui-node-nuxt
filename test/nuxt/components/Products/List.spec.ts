import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import { isRef, nextTick, unref } from 'vue'
import List from '~/components/Products/List.vue'
import type { ProductFilters } from '~~/shared/types/product-filters'
import { makeProductSearchHit, makeProductSearchResponse } from '~~/test/fixtures/productFilters'

/**
 * The listing turns the URL filters into one search request, shows
 * skeletons shaped like the grid until it lands, and — when nothing
 * matches — says which filter to loosen and offers to clear them all.
 * Default tree only: the webside List has no shared grid class and no
 * page links (see `app/components/variants/webside/Products/List.vue`).
 */
const pf = await vi.hoisted(async () =>
  (await import('~~/test/fixtures/productFilters')).createProductFiltersMock())
mockNuxtImport('useProductFilters', () => () => pf)

const { search, favourites, useApiMock, useLazyApiMock, session } = await vi.hoisted(async () => {
  const { createAsyncDataMock } = await import('~~/test/helpers/asyncData')
  const { ref } = await import('vue')
  const search = createAsyncDataMock<ProductMeiliSearchResponse>()
  const favourites = createAsyncDataMock<unknown>()
  return {
    search,
    favourites,
    useApiMock: vi.fn((_url: string, _options?: any) => search),
    useLazyApiMock: vi.fn((_url: string, _options?: any) => favourites),
    session: { loggedIn: ref(false), user: ref<{ id: number } | null>(null) },
  }
})
mockNuxtImport('useApi', () => useApiMock)
mockNuxtImport('useLazyApi', () => useLazyApiMock)
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: session.loggedIn,
  user: session.user,
  session: ref({}),
  ready: ref(true),
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))

// TransitionGroup renders the results' `<ol>`; test-utils stubs it by default.
const STUBS = { ProductsToolbar: true, ProductCard: true, ProductCardSkeleton: true, TransitionGroup: false }
const mountList = (props: { categoryId?: number } = {}) =>
  mountSuspended(List, { route: false, props, global: { stubs: STUBS } })

const t = (key: string, params: Record<string, unknown> = {}) => useNuxtApp().$i18n.t(key, params)

/** The search request's query, with the component's refs read out. */
function searchQuery(): Record<string, unknown> {
  const options = useApiMock.mock.calls.find(([url]) => url === '/api/products/search')?.[1]
  expect(options, 'no /api/products/search request').toBeDefined()
  return Object.fromEntries(Object.entries(options.query).map(([k, v]) => [k, isRef(v) ? unref(v) : v]))
}

function setFilters(filters: Partial<ProductFilters>, count = Object.keys(filters).length) {
  pf.filters.value = { ...pf.filters.value, ...filters }
  pf.activeFilterCount.value = count
}

function returns(hits: number, total = hits) {
  search.data.value = makeProductSearchResponse({
    results: Array.from({ length: hits }, (_, i) => makeProductSearchHit({ id: i + 1 })),
    estimatedTotalHits: total,
  })
  search.status.value = 'success'
}

const emptyState = (wrapper: VueWrapper) => wrapper.findComponent({ name: 'UEmpty' })

describe('Products/List', () => {
  beforeEach(() => {
    pf.reset()
    search.reset()
    favourites.reset()
    session.loggedIn.value = false
    session.user.value = null
  })

  describe('the search request', () => {
    it('carries every URL filter, in the page locale, from the first page', async () => {
      setFilters({ search: 'laptop', priceMin: 10, priceMax: 90, categories: ['2', '3'], attributeValues: ['7', '8'], sort: '-finalPrice' })

      await mountList()

      expect(searchQuery()).toMatchObject({
        query: 'laptop',
        priceMin: 10,
        priceMax: 90,
        categories: '2,3',
        attributeValues: '7,8',
        sort: '-finalPrice',
        languageCode: 'el',
        limit: 12,
        offset: 0,
      })
    })

    it('sends no category and no search when the URL has none', async () => {
      await mountList()

      expect(searchQuery()).toMatchObject({ query: undefined, categories: undefined, attributeValues: undefined })
    })

    it.each([
      ['alone', [], '5'],
      ['ahead of the URL\'s categories', ['2'], '5,2'],
      ['once, when the URL names it too', ['2', '5'], '2,5'],
    ])('scopes a category page to its own category %s', async (_case, categories, expected) => {
      setFilters({ categories })

      await mountList({ categoryId: 5 })

      expect(searchQuery().categories).toBe(expected)
    })
  })

  it('shows skeletons in the same grid as the results while the first page loads', async () => {
    search.status.value = 'pending'
    const loading = await mountList()
    const skeletonGrid = loading.find('ol')
    expect(loading.findAllComponents({ name: 'ProductCardSkeleton' })).toHaveLength(12)

    returns(3)
    await nextTick()

    expect(loading.findAllComponents({ name: 'ProductCardSkeleton' })).toHaveLength(0)
    expect(loading.findAllComponents({ name: 'ProductCard' })).toHaveLength(3)
    // The grid class IS the contract here: two copies drifted and the
    // page jumped a row when the products replaced the skeletons.
    expect(loading.find('ol').attributes('class')).toBe(skeletonGrid.attributes('class'))
  })

  describe('with no results', () => {
    beforeEach(() => returns(0))

    it('says so, with nothing to clear when no filter is set', async () => {
      const wrapper = await mountList()

      expect(emptyState(wrapper).text()).toContain(t('products.no_results.title'))
      expect(emptyState(wrapper).text()).toContain(t('products.no_results.no_filters'))
      expect(emptyState(wrapper).find('button').exists()).toBe(false)
    })

    it('clears every filter from its action', async () => {
      setFilters({ search: 'laptop' })
      const wrapper = await mountList()

      const action = emptyState(wrapper).find('button')
      expect(action.text()).toBe(t('products.no_results.clear_filters'))
      await action.trigger('click')

      expect(pf.clearFilters).toHaveBeenCalledOnce()
    })

    it.each<[string, Partial<ProductFilters>, string]>([
      ['the search first', { search: 'x', priceMin: 1, categories: ['1'] }, 'try_different_search'],
      ['the price before the category', { priceMax: 9, categories: ['1'], likesMin: 2 }, 'try_broader_price'],
      ['the category', { categories: ['1'], viewsMin: 5 }, 'try_different_category'],
      ['the likes minimum', { likesMin: 2, attributeValues: ['7'] }, 'try_lower_popularity'],
      ['the views minimum', { viewsMin: 5 }, 'try_lower_views'],
      ['the attributes', { attributeValues: ['7'] }, 'try_different_attributes'],
      ['in general for a sort alone', { sort: '-createdAt' }, 'description'],
    ])('suggests loosening %s', async (_case, filters, key) => {
      setFilters(filters)

      const wrapper = await mountList()

      expect(emptyState(wrapper).text()).toContain(t(`products.no_results.${key}`))
    })
  })

  describe('pagination', () => {
    it('offers page links while the results span several pages', async () => {
      returns(12, 30)

      const wrapper = await mountList()

      expect(wrapper.find('nav').text()).toContain(t('pagination.page_info', { current: 1, total: 3 }))
      expect(wrapper.find('nav a[href*="page=2"]').exists()).toBe(true)
    })

    it('offers no pagination for a single page', async () => {
      returns(12, 12)

      const wrapper = await mountList()

      expect(wrapper.find('nav').exists()).toBe(false)
    })
  })

  describe('the toolbar', () => {
    it('hands a new sort to the URL', async () => {
      returns(3)
      const wrapper = await mountList()

      wrapper.findComponent({ name: 'ProductsToolbar' }).vm.$emit('update:sort', '-createdAt')
      await nextTick()

      expect(pf.updateFilters).toHaveBeenCalledExactlyOnceWith({ sort: '-createdAt' })
    })

    it('asks for the new page size', async () => {
      returns(3)
      const wrapper = await mountList()

      wrapper.findComponent({ name: 'ProductsToolbar' }).vm.$emit('update:itemsPerPage', 24)
      await nextTick()

      expect(searchQuery().limit).toBe(24)
      expect(wrapper.findComponent({ name: 'ProductsToolbar' }).props('itemsPerPage')).toBe(24)
    })
  })

  describe('favourites', () => {
    it('are never asked for on a guest\'s visit', async () => {
      returns(3)

      await mountList()
      await nextTick()

      expect(favourites.execute).not.toHaveBeenCalled()
    })

    it('are asked for once the page is mounted for a signed-in shopper with products', async () => {
      returns(3)
      session.loggedIn.value = true
      session.user.value = { id: 9 }

      await mountList()
      await nextTick()

      expect(favourites.execute).toHaveBeenCalledOnce()
    })
  })
})
