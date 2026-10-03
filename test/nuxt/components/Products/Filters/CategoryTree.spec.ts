import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import CategoryTree from '~/components/Products/Filters/CategoryTree.vue'
import { buildCategoryForest, categoryTrail } from '~/utils/categoryTree'
import { makeCategory } from '~~/test/fixtures/productFilters'

/**
 * The filter column's categories are links down the store's tree,
 * opened along the path to the page's own category. The tree itself
 * (counts, pruning) is `utils/categoryTree.ts`'s; this spec feeds a
 * built forest in and checks what is drawn and where it leads.
 */
const tree = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return {
    forest: ref<import('~/utils/categoryTree').CategoryNode[]>([]),
    trail: ref<import('~/utils/categoryTree').CategoryNode[]>([]),
  }
})
mockNuxtImport('useCategoryForest', () => () => tree)

const CATEGORIES = [
  makeCategory({ id: 2, name: { el: 'Φόρτιση', en: 'Charging' } }),
  makeCategory({ id: 3, parent: 2, name: { el: 'Καλώδια', en: 'Cables' } }),
  makeCategory({ id: 6, parent: 3, name: { el: 'Πλεκτά', en: 'Braided' } }),
  makeCategory({ id: 4, parent: 2, name: { el: 'Φορτιστές', en: 'Chargers' } }),
  makeCategory({ id: 5, name: { el: 'Ήχος', en: 'Audio' } }),
  makeCategory({ id: 7, parent: 5, name: { el: 'Ακουστικά', en: 'Earbuds' } }),
]

function showPage(currentId?: number) {
  tree.forest.value = buildCategoryForest(CATEGORIES, 'el', { 6: 4, 3: 6, 4: 6, 7: 9 }, currentId)
  tree.trail.value = currentId === undefined ? [] : categoryTrail(tree.forest.value, currentId)
}

/** Every link drawn: its text (name + count), where it goes, and whether it is the current page. */
const links = (wrapper: VueWrapper) => wrapper.findAll('a').map(a => [
  a.findAll('span').map(span => span.text()).join(' '),
  a.attributes('href'),
  a.attributes('aria-current') ?? null,
])

describe('Products/Filters/CategoryTree', () => {
  beforeEach(() => showPage())

  it('draws only the top level on the store-wide listing', async () => {
    const wrapper = await mountSuspended(CategoryTree, { route: false })

    expect(links(wrapper)).toEqual([
      ['Φόρτιση 16', '/products/category/2/category-2', null],
      ['Ήχος 9', '/products/category/5/category-5', null],
    ])
  })

  it('opens the path to the current category, marks it, and shows the next step under it', async () => {
    showPage(3)

    const wrapper = await mountSuspended(CategoryTree, { route: false })

    expect(links(wrapper)).toEqual([
      ['Φόρτιση 16', '/products/category/2/category-2', null],
      ['Καλώδια 10', '/products/category/3/category-3', 'page'],
      ['Πλεκτά 4', '/products/category/6/category-6', null],
      ['Φορτιστές 6', '/products/category/4/category-4', null],
      ['Ήχος 9', '/products/category/5/category-5', null],
    ])
  })

  it('names the tree for assistive technology', async () => {
    const wrapper = await mountSuspended(CategoryTree, { route: false })

    const { t } = wrapper.vm as unknown as { t: (key: string) => string }
    expect(wrapper.find('ul').attributes('aria-label')).toBe(t('label'))
  })

  it('draws nothing for a store with no categories', async () => {
    tree.forest.value = []

    const wrapper = await mountSuspended(CategoryTree, { route: false })

    expect(wrapper.find('ul').exists()).toBe(false)
  })
})
