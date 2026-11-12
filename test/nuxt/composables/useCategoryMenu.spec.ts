import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { clearNuxtData } from '#app'
import { makeCategory } from '~~/test/fixtures/productFilters'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const CATEGORIES_URL = '/api/products/categories/all'
const KEY = 'category-menu-el'

async function menu() {
  let result!: ReturnType<typeof useCategoryMenu>
  await mountSuspended(defineComponent({
    setup() {
      result = useCategoryMenu()
      return () => h('div')
    },
  }), { route: false })
  await vi.waitFor(() => expect(useNuxtApp().payload.data[KEY]).toBeDefined())
  return result
}

/**
 * The category tree as the menus draw it. The menus sit on every page,
 * so what this reads is serialised into every cached page: it is cut to
 * the menu's shape (two levels, eight of each, in the page's language)
 * BEFORE it reaches the payload.
 */
describe('useCategoryMenu', () => {
  beforeEach(() => {
    clearNuxtData([KEY])
    setTenant()
    setTenantFeatures({ catalogue: true })
  })

  it('lists the active roots with their active children, in the page\'s language, with each count', async () => {
    api.routes({
      [CATEGORIES_URL]: [
        makeCategory({ id: 2, name: { el: 'Φόρτιση', en: 'Charging' }, recursiveProductCount: 28 }),
        makeCategory({ id: 3, parent: 2, level: 1, name: { el: 'Καλώδια', en: 'Cables' }, recursiveProductCount: 7 }),
        makeCategory({ id: 4, parent: 2, level: 1, active: false }),
        makeCategory({ id: 5, parent: 3, level: 2 }),
        makeCategory({ id: 6, active: false }),
      ],
    })

    const { categories } = await menu()

    expect(categories.value.map(root => [root.label, root.to, root.productCount, root.children.map(child => [child.label, child.productCount, child.children.length])]))
      .toEqual([['Φόρτιση', '/products/category/2/category-2', 28, [['Καλώδια', 7, 0]]]])
  })

  it('lists eight roots and eight children of each at most', async () => {
    api.routes({
      [CATEGORIES_URL]: [
        ...Array.from({ length: 10 }, (_, i) => makeCategory({ id: 100 + i })),
        ...Array.from({ length: 10 }, (_, i) => makeCategory({ id: 200 + i, parent: 100, level: 1 })),
      ],
    })

    const { categories } = await menu()

    expect(categories.value.map(root => root.id)).toEqual([100, 101, 102, 103, 104, 105, 106, 107])
    expect(categories.value[0]!.children.map(child => child.id)).toEqual([200, 201, 202, 203, 204, 205, 206, 207])
  })

  it('keeps only the menu in the payload, not the category list', async () => {
    api.routes({ [CATEGORIES_URL]: [makeCategory({ id: 2, name: { el: 'Φόρτιση', en: 'Charging' } })] })

    const { categories } = await menu()

    expect(useNuxtApp().payload.data[KEY]).toEqual(categories.value)
    expect(JSON.stringify(useNuxtApp().payload.data[KEY])).not.toContain('Charging')
  })

  it('asks for nothing, and lists nothing, without the catalogue', async () => {
    setTenantFeatures({ catalogue: false })
    api.routes({ [CATEGORIES_URL]: [makeCategory()] })

    let result!: ReturnType<typeof useCategoryMenu>
    await mountSuspended(defineComponent({
      setup() {
        result = useCategoryMenu()
        return () => h('div')
      },
    }), { route: false })

    expect(result.hasCategories.value).toBe(false)
    expect(api.callsTo(CATEGORIES_URL)).toEqual([])
  })
})
