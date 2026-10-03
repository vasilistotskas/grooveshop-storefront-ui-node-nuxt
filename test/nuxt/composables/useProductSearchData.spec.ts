import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { failWith } from '~~/test/helpers/api'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { effectScope, nextTick, ref } from 'vue'
import type { EffectScope } from 'vue'
import type { ProductFilters } from '~~/shared/types/product-filters'
import type { ProductSearchScope } from '~/composables/useProductSearchData'

/**
 * The filter sidebar's data: the listing's filters become the facet
 * queries sent to `/api/products/search` (each facet leaves out its OWN
 * filter, so a category's count reflects every other filter), plus the
 * price bounds and the id → name lookups the chips use.
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
}
const filters = ref<ProductFilters>({ ...NO_FILTERS })
mockNuxtImport('useProductFilters', () => () => ({ filters }))

const SEARCH = '/api/products/search'

/** The search requests for one facet, by its `facets` query value. */
function facetRequests(facet: string) {
  return api.callsTo(SEARCH)
    .map(call => call.options.query)
    .filter(query => query.facets === facet)
}

let scope: EffectScope | undefined

/** A search route answering per requested facet; an unlisted facet gets `{}`. */
function byFacet(answers: Record<string, unknown>) {
  return (_url: string, options: { query: { facets: string } }) => answers[options.query.facets] ?? {}
}

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
  clearNuxtData()
  filters.value = { ...NO_FILTERS }
})

afterEach(() => {
  scope?.stop()
  scope = undefined
})

describe('useProductSearchData', () => {
  describe('facet queries', () => {
    it('sends every other filter with each facet, and leaves the facet\'s own filter out', async () => {
      filters.value = {
        search: 'shoe',
        priceMin: 10,
        priceMax: 90,
        likesMin: 2,
        viewsMin: 50,
        categories: ['1', '2'],
        sort: '-finalPrice',
        attributeValues: ['3', '4'],
      }

      setup()
      await flushPromises()

      const shared = { languageCode: 'el', query: 'shoe', priceMin: 10, priceMax: 90, likesMin: 2, viewsMin: 50, sort: '-finalPrice', limit: 1 }
      expect(facetRequests('category')).toEqual([{ ...shared, attributeValues: '3,4', facets: 'category' }])
      expect(facetRequests('attribute_values')).toEqual([{ ...shared, categories: '1,2', facets: 'attribute_values' }])
    })

    it('sends no search, category or attribute filter when none is set', async () => {
      setup()
      await flushPromises()

      const [category] = facetRequests('category')
      const [attributes] = facetRequests('attribute_values')
      expect(category).toMatchObject({ query: undefined, attributeValues: undefined })
      expect(attributes).toMatchObject({ query: undefined, categories: undefined })
    })

    it('asks again when a filter changes, with the new value', async () => {
      setup()
      await flushPromises()

      filters.value = { ...NO_FILTERS, attributeValues: ['7'] }
      await nextTick()
      await flushPromises()

      expect(facetRequests('category').map(query => query.attributeValues)).toEqual([undefined, '7'])
    })

    it('counts attribute values inside the scoped category, beside the URL\'s own category filter', async () => {
      filters.value = { ...NO_FILTERS, categories: ['9'] }

      setup({ categoryId: 4 })
      await flushPromises()

      expect(facetRequests('attribute_values').map(query => query.categories)).toEqual(['4,9'])
      // The category facet stays store-wide: it draws the whole tree.
      expect(facetRequests('category').map(query => query.categories)).toEqual([undefined])
    })

    it('exposes each facet\'s distribution, or none', async () => {
      api.routes({
        [SEARCH]: byFacet({ category: { facetDistribution: { category: { 1: 4 } } } }),
      })

      const { categoryFacets, attributeValueFacets } = setup()
      await flushPromises()

      expect(categoryFacets.value).toEqual({ 1: 4 })
      expect(attributeValueFacets.value).toEqual({})
    })
  })

  describe('price bounds', () => {
    it('asks for the store-wide price facet, without the listing\'s filters', async () => {
      filters.value = { ...NO_FILTERS, priceMin: 10, search: 'shoe' }

      setup()
      await flushPromises()

      expect(facetRequests('final_price')).toEqual([{ facets: 'final_price', limit: 1, languageCode: 'el' }])
    })

    it('asks for the scoped category\'s price facet, under a key of its own', async () => {
      setup({ categoryId: 4 })
      await flushPromises()
      setup()
      await flushPromises()

      expect(facetRequests('final_price')).toEqual([
        { facets: 'final_price', limit: 1, languageCode: 'el', categories: '4' },
        { facets: 'final_price', limit: 1, languageCode: 'el' },
      ])
    })

    it.each([
      ['the price facet', { facetStats: { finalPrice: { min: 5, max: 250 } } }, { min: 5, max: 250 }],
      ['no price facet', { facetStats: {} }, { min: 0, max: 1000 }],
    ])('reads the slider bounds from %s', async (_case, answer, bounds) => {
      api.routes({ [SEARCH]: byFacet({ final_price: answer }) })

      const { priceStats } = setup()
      await flushPromises()

      expect(priceStats.value).toEqual(bounds)
    })

    // `isPriceStatsLoaded` gates the slider: it must be true only with
    // real bounds, or the slider renders the placeholder 0–1000 range —
    // until the stats arrive, and for good when they cannot.
    it('reports the bounds as loaded only once the price facet answered', async () => {
      api.routes({ [SEARCH]: byFacet({ final_price: { facetStats: { finalPrice: { min: 5, max: 250 } } } }) })

      const { isPriceStatsLoaded } = setup()
      expect(isPriceStatsLoaded.value).toBe(false)
      await flushPromises()

      expect(isPriceStatsLoaded.value).toBe(true)
    })

    it.each([
      ['the price search fails', failWith(502)],
      ['the search reports no price facet', byFacet({ final_price: { facetStats: {} } })],
    ])('never reports the bounds as loaded when %s', async (_case, answer) => {
      api.routes({ [SEARCH]: answer })

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
