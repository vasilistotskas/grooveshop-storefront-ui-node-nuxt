import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isRef, unref } from 'vue'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import List from '~/components/Products/List.vue'
import WebsideList from '~/components/variants/webside/Products/List.vue'
import { makeProductSearchHit, makeProductSearchResponse } from '~~/test/fixtures/productFilters'
import { setTenantFeatures } from '~~/test/helpers/tenant'
import { trees } from '~~/test/helpers/trees'

/**
 * The listing's address is what it searches for, in every design: both
 * drawings run `useProductListing`, which reads the URL through the real
 * `useProductFilters` here (the other listing specs mock it). A sort and a
 * page change go back through the address, so the filters it carries
 * survive them.
 */

// The navigation only needs the route: the products page is an empty
// component, or vue-router would load its whole graph first.
const { PageStub } = await vi.hoisted(async () => {
  const { defineComponent } = await import('vue')
  return { PageStub: defineComponent({ render: () => null }) }
})
vi.mock('~/pages/products/index.vue', () => ({ default: PageStub }))

const { search, favourites, useApiMock, useLazyApiMock } = await vi.hoisted(async () => {
  const { createAsyncDataMock } = await import('~~/test/helpers/asyncData')
  const search = createAsyncDataMock<ProductMeiliSearchResponse>()
  const favourites = createAsyncDataMock<unknown>()
  return {
    search,
    favourites,
    useApiMock: vi.fn((_url: string, _options?: { query?: Record<string, unknown> }) => search),
    useLazyApiMock: vi.fn((_url: string, _options?: unknown) => favourites),
  }
})
mockNuxtImport('useApi', () => useApiMock)
mockNuxtImport('useLazyApi', () => useLazyApiMock)

/** The search request's query as it stands now, its refs read out. */
function searchQuery(): Record<string, unknown> {
  const options = useApiMock.mock.calls.find(([url]) => url === '/api/products/search')?.[1]
  expect(options?.query, 'no /api/products/search request').toBeDefined()
  return Object.fromEntries(Object.entries(options!.query!).map(([key, value]) => [key, isRef(value) ? unref(value) : value]))
}

const currentQuery = () => useNuxtApp().$router.currentRoute.value.query

describe.each(trees(List, WebsideList))('$tree product listing: the address reaches the search', ({ C, own }) => {
  beforeEach(() => {
    setTenantFeatures({ catalogue: true })
    clearNuxtState('product-listing-limit')
    search.reset()
    favourites.reset()
    // Three pages of twelve.
    search.data.value = makeProductSearchResponse({
      results: Array.from({ length: 12 }, (_, i) => makeProductSearchHit({ id: i + 1 })),
      estimatedTotalHits: 30,
    })
    search.status.value = 'success'
  })

  const stubs = { [own('ProductsToolbar')]: true, [own('ProductCard')]: true, [own('ProductCardSkeleton')]: true }
  const mount = () => mountSuspended(C, { route: '/products?sort=-createdAt&inStock=true', global: { stubs } })

  it('asks for what the address names: in stock only, newest first, from the first page', async () => {
    await mount()

    expect(searchQuery()).toMatchObject({ inStock: true, sort: '-createdAt', offset: 0 })
  })

  it('keeps the in-stock filter through a change of sort', async () => {
    const wrapper = await mount()

    wrapper.findComponent({ name: own('ProductsToolbar') }).vm.$emit('update:sort', 'effectivePrice')

    await vi.waitFor(() => expect(currentQuery().sort).toBe('effectivePrice'))
    expect(currentQuery().inStock).toBe('true')
    expect(searchQuery()).toMatchObject({ inStock: true, sort: 'effectivePrice' })
  })

  it('keeps the in-stock filter and the sort through a change of page', async () => {
    const wrapper = await mount()

    wrapper.findComponent({ name: 'UPagination' }).vm.$emit('update:page', 2)

    await vi.waitFor(() => expect(currentQuery().page).toBe('2'))
    expect(currentQuery()).toMatchObject({ inStock: 'true', sort: '-createdAt' })
    expect(searchQuery()).toMatchObject({ inStock: true, sort: '-createdAt', offset: 12 })
  })
})
