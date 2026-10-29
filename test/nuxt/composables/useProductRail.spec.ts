import { describe, it, expect, beforeEach, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { clearNuxtData } from '#app'
import { makeProductCard } from '~~/test/fixtures/product'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const PRODUCTS_URL = '/api/products'

/** Mounts a component that reads the rail and prints how many products it got. */
async function mountRail() {
  return mountSuspended(defineComponent({
    async setup() {
      const rail = await useProductRail({ pageSize: 4, ordering: 'newest' })
      return () => h('p', { 'data-count': rail.products.value.length }, String(rail.hasProducts.value))
    },
  }), { route: false })
}

/**
 * A rail is a request for catalogue products, so a store without the
 * catalogue asks for none (Django answers 404 for the route there).
 */
describe('useProductRail', () => {
  beforeEach(() => {
    clearNuxtData()
    setTenant()
    api.routes({ [PRODUCTS_URL]: { results: [makeProductCard({ id: 7 }), makeProductCard({ id: 8 })], count: 2 } })
  })

  it('asks for the products of a store with the catalogue', async () => {
    const wrapper = await mountRail()

    expect(api.callsTo(PRODUCTS_URL)).toHaveLength(1)
    expect(wrapper.find('p').attributes('data-count')).toBe('2')
  })

  it('makes no request, and has no products, on a store without the catalogue', async () => {
    setTenantFeatures({ catalogue: false })

    const wrapper = await mountRail()

    expect(api.callsTo(PRODUCTS_URL)).toEqual([])
    expect(wrapper.find('p').text()).toBe('false')
  })
})
