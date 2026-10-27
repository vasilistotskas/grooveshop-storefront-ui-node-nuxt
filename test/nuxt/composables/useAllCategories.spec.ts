import { describe, it, expect, beforeEach, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { clearNuxtData } from '#app'
import { makeCategory } from '~~/test/fixtures/productFilters'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const CATEGORIES_URL = '/api/products/categories/all'
const BRANDS_URL = '/api/products/brands/all'

/** Mounts a component that calls the composables, as the menus and filters do. */
async function mountReaders() {
  let menu!: ReturnType<typeof useCategoryMenu>
  await mountSuspended(defineComponent({
    setup() {
      menu = useCategoryMenu()
      useAllBrands()
      return () => null
    },
  }), { route: false })
  return menu
}

/**
 * The category menu and the brand filter read catalogue lists: a store
 * without the catalogue asks for neither, and its menu stays empty.
 */
describe('the category and brand lists', () => {
  beforeEach(() => {
    clearNuxtData(['all-categories', 'all-brands'])
    setTenant()
    api.routes({
      [CATEGORIES_URL]: [makeCategory({ id: 1 })],
      [BRANDS_URL]: [],
    })
  })

  it('are requested by a store with the catalogue, and fill its menu', async () => {
    const menu = await mountReaders()

    await vi.waitFor(() => expect(api.callsTo(CATEGORIES_URL)).toHaveLength(1))
    expect(api.callsTo(BRANDS_URL)).toHaveLength(1)
    expect(menu.categories.value.map(entry => entry.id)).toEqual([1])
  })

  it('are not requested by a store without the catalogue, whose menu is empty', async () => {
    setTenantFeatures({ catalogue: false })

    const menu = await mountReaders()

    expect(api.callsTo(CATEGORIES_URL)).toEqual([])
    expect(api.callsTo(BRANDS_URL)).toEqual([])
    expect(menu.categories.value).toEqual([])
  })
})
