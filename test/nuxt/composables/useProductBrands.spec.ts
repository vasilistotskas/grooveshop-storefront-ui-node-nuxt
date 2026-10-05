import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { effectScope, ref } from 'vue'
import type { EffectScope } from 'vue'
import type { ProductFilters } from '~~/shared/types/product-filters'
import { makeBrand, makeProductFilters } from '~~/test/fixtures/productFilters'

/**
 * The brand filter's data: the brand facet is asked with every OTHER
 * filter (never the brands themselves) and the listing's category scope,
 * and the brand list names the ids the facet counts.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)
mockNuxtImport('useRequestApi', () => () => api)

const filters = ref<ProductFilters>(makeProductFilters())
mockNuxtImport('useProductFilters', () => () => ({ filters }))

const SEARCH = '/api/products/search'
const BRANDS = '/api/products/brands/all'

let scope: EffectScope | undefined

function setup(categoryId?: number) {
  scope = effectScope()
  let data!: ReturnType<typeof useProductBrands>
  scope.run(() => useNuxtApp().runWithContext(() => {
    data = useProductBrands({ categoryId })
  }))
  return data
}

beforeEach(() => {
  clearNuxtData()
  filters.value = makeProductFilters()
})

afterEach(() => {
  scope?.stop()
  scope = undefined
})

describe('useProductBrands', () => {
  it('asks for the brand facet with every other filter and the category scope, and not the brands', async () => {
    filters.value = makeProductFilters({
      search: 'shoe',
      priceMin: 10,
      priceMax: 90,
      categories: ['9'],
      attributeValues: ['3', '4'],
      brands: ['5'],
      inStock: true,
      sort: '-finalPrice',
    })

    setup(4)
    await flushPromises()

    expect(api.callsTo(SEARCH).map(call => call.options.query)).toEqual([{
      languageCode: 'el',
      query: 'shoe',
      priceMin: 10,
      priceMax: 90,
      categories: '4,9',
      attributeValues: '3,4',
      inStock: true,
      sort: '-finalPrice',
      facets: 'brand',
      limit: 1,
    }])
  })

  it('asks again when a filter changes', async () => {
    setup()
    await flushPromises()

    filters.value = makeProductFilters({ onOffer: true })
    await flushPromises()

    expect(api.callsTo(SEARCH).map(call => call.options.query.onOffer)).toEqual([undefined, true])
  })

  it('exposes the facet\'s counts by brand id, or none', async () => {
    api.routes({
      [SEARCH]: { facetDistribution: { brand: { 3: 14 } } },
    })
    const counted = setup()
    await flushPromises()
    expect(counted.brandFacets.value).toEqual({ 3: 14 })

    api.routes({ [SEARCH]: {} })
    clearNuxtData()
    scope?.stop()
    const none = setup(2)
    await flushPromises()
    expect(none.brandFacets.value).toEqual({})
  })

  it('names a brand id from the brand list, and falls back to the id for an unknown one', async () => {
    api.routes({ [BRANDS]: [makeBrand({ id: 3, name: 'Voltra' })] })

    const { getBrandName } = setup()
    await flushPromises()

    expect(getBrandName('3')).toBe('Voltra')
    expect(getBrandName('99')).toBe('99')
  })
})
