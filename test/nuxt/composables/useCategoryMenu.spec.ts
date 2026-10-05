import { describe, expect, it } from 'vitest'
import { defineComponent, ref } from 'vue'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import type { ProductCategory } from '~~/shared/openapi/types.gen'
import { makeCategory } from '~~/test/fixtures/productFilters'

const categories = ref<ProductCategory[]>([])
mockNuxtImport('useAllCategories', () => () => ({ data: categories }))

describe('useCategoryMenu', () => {
  it('carries each category\'s recursive product count into its entry', async () => {
    categories.value = [
      makeCategory({ id: 1, recursiveProductCount: 28 }),
      makeCategory({ id: 2, parent: 1, level: 1, recursiveProductCount: 7 }),
    ]

    let menu!: ReturnType<typeof useCategoryMenu>
    await mountSuspended(defineComponent({
      setup() {
        menu = useCategoryMenu()
        return () => null
      },
    }), { route: false })
    const [root] = menu.categories.value

    expect(root!.productCount).toBe(28)
    expect(root!.children[0]!.productCount).toBe(7)
  })
})
