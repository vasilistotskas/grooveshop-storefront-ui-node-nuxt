import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { effectScope, ref } from 'vue'
import type { EffectScope } from 'vue'
import type { ProductFilters } from '~~/shared/types/product-filters'
import { makeBrand, makeProductFilters } from '~~/test/fixtures/productFilters'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * The brand filter's data: the brand counts come from the listing's one
 * search (`sidebarFacets` leaves the brands' own selection out of them), so
 * this composable makes no products search of its own beyond that one, and
 * the brand list names the ids the facet counts.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

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
  // The brand list is read only on a store whose catalogue is on.
  setTenant()
  clearNuxtData()
  filters.value = makeProductFilters()
})

afterEach(() => {
  scope?.stop()
  scope = undefined
  clearNuxtData()
})

describe('useProductBrands', () => {
  it('shares the one listing search, scoped to the category, instead of asking for the brand facet itself', async () => {
    filters.value = makeProductFilters({ categories: ['9'], brands: ['5'], inStock: true })

    setup(4)
    setup(4)
    await flushPromises()

    const searches = api.callsTo(SEARCH).map(call => call.options.query)
    expect(searches).toHaveLength(1)
    expect(searches[0]).toMatchObject({
      categories: '4,9',
      scopeCategory: 4,
      brands: '5',
      inStock: true,
      sidebarFacets: true,
    })
    expect(searches[0].facets.split(',')).toContain('brand')
  })

  it('exposes the facet counts by brand id, or none', async () => {
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
