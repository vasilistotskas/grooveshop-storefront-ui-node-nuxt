import { describe, it, expect, beforeEach, vi } from 'vitest'
import { defineComponent, ref } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { clearNuxtData } from '#app'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const TRENDING_URL = '/api/search/trending'
const SEARCH_URL = '/api/search'

async function mountSearch() {
  let search!: ReturnType<typeof useQuickSearch>
  await mountSuspended(defineComponent({
    setup() {
      search = useQuickSearch({ query: ref('lamp') })
      return () => null
    },
  }), { route: false })
  return search
}

/**
 * The search palette searches the catalogue: a store without one asks
 * for neither the trending queries nor results, however the palette
 * drives it (Django answers 404 for the routes there).
 */
describe('useQuickSearch', () => {
  beforeEach(() => {
    clearNuxtData()
    setTenant()
    api.routes({
      [TRENDING_URL]: { windowHours: 24, contentType: 'product', languageCode: null, results: [] },
      [SEARCH_URL]: { results: [], count: 0 },
    })
  })

  it('asks for the trending queries and the results on a store with the catalogue', async () => {
    const search = await mountSearch()
    await search.execute()

    await vi.waitFor(() => expect(api.callsTo(TRENDING_URL)).toHaveLength(1))
    expect(api.callsTo(SEARCH_URL)).toHaveLength(1)
  })

  it('asks for neither on a store without the catalogue', async () => {
    setTenantFeatures({ catalogue: false })

    const search = await mountSearch()
    await search.execute()

    expect(api.callsTo(TRENDING_URL)).toEqual([])
    expect(api.callsTo(SEARCH_URL)).toEqual([])
  })
})
