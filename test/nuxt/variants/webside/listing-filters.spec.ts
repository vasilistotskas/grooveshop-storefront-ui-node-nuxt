import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { effectScope, ref } from 'vue'
import type { EffectScope } from 'vue'
import WebsideActiveFilters from '~/components/variants/webside/Products/Filters/ActiveFilters.vue'

/**
 * The frozen webside listing has no brand, in-stock or on-offer filter:
 * its List never sends them. A link copied from a store that has them
 * (`?inStock=true&onOffer=true&brand=3`) must therefore change nothing on
 * webside — not its facet queries, not its active-filter count, not its
 * chips — whatever the URL says.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)
mockNuxtImport('useRequestApi', () => () => api)

const route = ref({ query: {} as Record<string, string> })
mockNuxtImport('useRoute', () => () => route.value)

const NEW_FILTERS = { inStock: 'true', onOffer: 'true', brand: '3' }
const SEARCH = '/api/products/search'

let scope: EffectScope | undefined

afterEach(() => {
  scope?.stop()
  scope = undefined
  route.value = { query: {} }
})

/** What webside's components read, called as they call it: no listing scope. */
async function websideReads(query: Record<string, string>) {
  clearNuxtData()
  api.mockClear()
  route.value = { query }
  scope = effectScope()
  let read!: { filters: ReturnType<typeof useProductFilters>, search: ReturnType<typeof useProductSearchData> }
  scope.run(() => useNuxtApp().runWithContext(() => {
    read = { filters: useProductFilters(), search: useProductSearchData() }
  }))
  await flushPromises()
  scope.stop()
  scope = undefined
  return {
    searchQueries: api.callsTo(SEARCH).map(call => call.options.query),
    // The keys reach the SSR payload: they must match too.
    asyncDataKeys: Object.keys(useNuxtApp()._asyncData).filter(key => key.includes('facets')).toSorted(),
    activeFilterCount: read.filters.activeFilterCount.value,
    hasActiveFilters: read.filters.hasActiveFilters.value,
    filterCountBySection: read.filters.filterCountBySection.value,
    chips: read.filters.activeFilterChips.value,
  }
}

describe('webside listing with brand and availability filters in the URL', () => {
  it('sends the facet queries of a URL without them', async () => {
    const plain = await websideReads({})
    const crafted = await websideReads(NEW_FILTERS)

    expect(plain.searchQueries.length).toBeGreaterThan(0)
    expect(crafted.searchQueries).toEqual(plain.searchQueries)
    expect(plain.asyncDataKeys.length).toBeGreaterThan(0)
    expect(crafted.asyncDataKeys).toEqual(plain.asyncDataKeys)
  })

  it('counts no active filter and draws no chip', async () => {
    const crafted = await websideReads(NEW_FILTERS)

    expect(crafted.activeFilterCount).toBe(0)
    expect(crafted.hasActiveFilters).toBe(false)
    expect(crafted.filterCountBySection).toEqual((await websideReads({})).filterCountBySection)
    expect(crafted.chips).toEqual([])
  })

  it('renders no chip list and no Clear button', async () => {
    route.value = { query: NEW_FILTERS }

    const wrapper = await mountSuspended(WebsideActiveFilters, { route: false })

    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })
})
