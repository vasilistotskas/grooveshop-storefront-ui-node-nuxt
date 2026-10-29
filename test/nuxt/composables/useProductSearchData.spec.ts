import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { failWith } from '~~/test/helpers/api'
import { setTenant } from '~~/test/helpers/tenant'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { effectScope, nextTick, ref } from 'vue'
import type { EffectScope } from 'vue'
import type { ProductFilters } from '~~/shared/types/product-filters'
import type { ProductSearchScope } from '~/composables/useProductSearchData'

/**
 * The filter sidebar's data. Its counts and ranges are not requested here:
 * they are read from the listing's one search (`useProductListingSearch`,
 * `sidebarFacets`), which carries every filter, so the sidebar and the
 * listing share one request however many controls read it. This spec holds
 * what the sidebar does with that answer (the price bounds, the category
 * and attribute counts) and the id → name lookups the chips use.
 *
 * `useProductFilters` is mocked to a plain ref: how the URL becomes
 * `filters` is its own spec's business (`test/unit/app/utils/productFilters.spec.ts`).
 */

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)
mockNuxtImport('useRequestApi', () => () => api)

const NO_FILTERS: ProductFilters = {
  search: '',
  priceMin: undefined,
  priceMax: undefined,
  likesMin: undefined,
  viewsMin: undefined,
  categories: [],
  sort: '',
  attributeValues: [],
  brands: [],
  inStock: false,
  onOffer: false,
}
const filters = ref<ProductFilters>({ ...NO_FILTERS })
mockNuxtImport('useProductFilters', () => () => ({ filters }))

const SEARCH = '/api/products/search'

/** The products-search requests the sidebar's readers made. */
const searches = () => api.callsTo(SEARCH).map(call => call.options.query)

/** A listing answer carrying the sidebar's counts and ranges. */
const answer = (extra: Record<string, unknown>) => ({ results: [], estimatedTotalHits: 0, ...extra })

let scope: EffectScope | undefined

function setup(searchScope?: ProductSearchScope) {
  scope = effectScope()
  // `runWithContext` is typed as possibly async; this composable is sync.
  let data!: ReturnType<typeof useProductSearchData>
  scope.run(() => useNuxtApp().runWithContext(() => {
    data = useProductSearchData(searchScope)
  }))
  return data
}

beforeEach(() => {
  // The category and brand lists are read only on a store whose
  // catalogue is on.
  setTenant()
  clearNuxtData()
  filters.value = { ...NO_FILTERS }
})

afterEach(() => {
  scope?.stop()
  scope = undefined
  clearNuxtData()
})

describe('useProductSearchData', () => {
  describe('the one search', () => {
    it('makes ONE products search however many times it is read, carrying every filter and the sidebar switch', async () => {
      filters.value = {
        search: 'shoe',
        priceMin: 10,
        priceMax: 90,
        likesMin: 2,
        viewsMin: 50,
        categories: ['1', '2'],
        sort: '-effectivePrice',
        attributeValues: ['3', '4'],
        brands: ['5', '6'],
        inStock: true,
        onOffer: true,
      }

      setup()
      setup()
      await flushPromises()

      expect(searches()).toHaveLength(1)
      expect(searches()[0]).toMatchObject({
        languageCode: 'el',
        query: 'shoe',
        priceMin: 10,
        priceMax: 90,
        likesMin: 2,
        viewsMin: 50,
        categories: '1,2',
        sort: '-effectivePrice',
        attributeValues: '3,4',
        brands: '5,6',
        inStock: true,
        onOffer: true,
        facets: 'category,brand,attribute_values,effective_price,likes_count,view_count',
        sidebarFacets: true,
      })
    })

    it('asks again when a filter changes, with the new value', async () => {
      setup()
      await flushPromises()

      filters.value = { ...NO_FILTERS, attributeValues: ['7'] }
      await nextTick()
      await flushPromises()

      expect(searches()).toHaveLength(2)
      expect(searches()[1]).toMatchObject({ attributeValues: '7' })
    })

    it('scopes the search to the category beside the URL own category filter, never filtering by the scope alone', async () => {
      filters.value = { ...NO_FILTERS, categories: ['9'] }

      setup({ categoryId: 4 })
      await flushPromises()

      // An earlier spec's request (a scope-less key) can still watch the shared
      // `filters` ref, since only a component's unmount stops it.
      const scoped = searches().filter(query => query.scopeCategory === 4)
      expect(scoped).toHaveLength(1)
      expect(scoped[0]).toMatchObject({ categories: '4,9' })
    })

    it('sends no scope on the store-wide listing', async () => {
      setup()
      await flushPromises()

      expect(searches()[0]!.scopeCategory).toBeUndefined()
      expect(searches()[0]!.categories).toBeUndefined()
    })

    it('exposes each facet distribution, or none', async () => {
      api.routes({ [SEARCH]: answer({ facetDistribution: { category: { 1: 4 } } }) })

      const { categoryFacets, attributeValueFacets } = setup()
      await flushPromises()

      expect(categoryFacets.value).toEqual({ 1: 4 })
      expect(attributeValueFacets.value).toEqual({})
    })

    it('exposes the attribute value counts', async () => {
      api.routes({ [SEARCH]: answer({ facetDistribution: { attributeValues: { 3: 9 } } }) })

      const { attributeValueFacets } = setup()
      await flushPromises()

      expect(attributeValueFacets.value).toEqual({ 3: 9 })
    })
  })

  // The webside listing reads this composable and has no brand
  // filter: it must not fetch the brand list.
  it('asks for no brand list', async () => {
    setup()
    await flushPromises()

    expect(api.callsTo('/api/products/brands/all')).toEqual([])
  })

  describe('price bounds', () => {
    it.each([
      ['the price stats', answer({ facetStats: { effectivePrice: { min: 5, max: 250 } } }), { min: 5, max: 250 }],
      ['no price stats', answer({ facetStats: {} }), { min: 0, max: 1000 }],
    ])('reads the slider bounds from %s', async (_case, response, bounds) => {
      api.routes({ [SEARCH]: response })

      const { priceStats } = setup()
      await flushPromises()

      expect(priceStats.value).toEqual(bounds)
    })

    // `isPriceStatsLoaded` gates the slider: it must be true only with
    // real bounds, or the slider renders the placeholder 0–1000 range —
    // until the stats arrive, and for good when they cannot.
    it('reports the bounds as loaded only once the search answered with them', async () => {
      api.routes({ [SEARCH]: answer({ facetStats: { effectivePrice: { min: 5, max: 250 } } }) })

      const { isPriceStatsLoaded } = setup()
      expect(isPriceStatsLoaded.value).toBe(false)
      await flushPromises()

      expect(isPriceStatsLoaded.value).toBe(true)
    })

    it.each([
      ['the search fails', failWith(502)],
      ['the search reports no price stats', () => answer({ facetStats: {} })],
    ])('never reports the bounds as loaded when %s', async (_case, handler) => {
      api.routes({ [SEARCH]: handler })

      const { isPriceStatsLoaded } = setup()
      await flushPromises()

      expect(isPriceStatsLoaded.value).toBe(false)
    })
  })

  describe('names for the chips', () => {
    it('names categories and attribute values in the page locale, and falls back to the id', async () => {
      api.routes({
        '/api/products/categories/all': [
          { id: 1, translations: { el: { name: 'Παπούτσια' }, en: { name: 'Shoes' } } },
        ],
        '/api/products/attributes/values': {
          results: [{ id: 3, translations: { el: { value: 'Κόκκινο' }, en: { value: 'Red' } } }],
        },
      })

      const { getCategoryName, getAttributeValueName } = setup()
      await flushPromises()

      expect(getCategoryName('1')).toBe('Παπούτσια')
      expect(getCategoryName('99')).toBe('99')
      expect(getAttributeValueName('3')).toBe('Κόκκινο')
      expect(getAttributeValueName('98')).toBe('98')
    })
  })
})
