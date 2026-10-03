import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import CategoryChips from '~/components/Products/CategoryChips.vue'
import { buildCategoryForest, categoryTrail } from '~/utils/categoryTree'
import { makeCategory } from '~~/test/fixtures/productFilters'

/**
 * The chips under a listing's title are where a shopper can go next:
 * a category's subcategories, a leaf's siblings (and the way back up),
 * the store's top level on the store-wide listing. The first chip is
 * always "all of it", and the page a shopper is on is marked.
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
  makeCategory({ id: 4, parent: 2, name: { el: 'Φορτιστές', en: 'Chargers' } }),
  makeCategory({ id: 5, name: { el: 'Ήχος', en: 'Audio' } }),
]

/** `counts: null` is a facet that has not answered yet. */
function showPage(currentId?: number, counts: Record<string, number> | null = { 3: 10, 4: 6, 5: 9 }) {
  tree.forest.value = buildCategoryForest(CATEGORIES, 'el', counts ?? undefined, currentId)
  tree.trail.value = currentId === undefined ? [] : categoryTrail(tree.forest.value, currentId)
}

const own = (wrapper: VueWrapper, key: string, params: Record<string, unknown> = {}) =>
  (wrapper.vm as unknown as { t: (k: string, p: Record<string, unknown>) => string }).t(key, params)

/** Each chip: its label and count as drawn, where it goes, and whether it is the current page. */
const chips = (wrapper: VueWrapper) => wrapper.findAll('a').map(a => [
  a.text().replace(/\s+/g, ' ').trim(),
  a.attributes('href'),
  a.attributes('aria-current') ?? null,
])

describe('Products/CategoryChips', () => {
  beforeEach(() => showPage())

  it('lists the top level after "all products" on the store-wide listing, which is current', async () => {
    const wrapper = await mountSuspended(CategoryChips, { route: false })

    expect(chips(wrapper)).toEqual([
      [`${own(wrapper, 'all_products')} 25`, '/products', 'page'],
      ['Φόρτιση 16', '/products/category/2/category-2', null],
      ['Ήχος 9', '/products/category/5/category-5', null],
    ])
  })

  it('lists a category\'s subcategories after the category itself, which is current', async () => {
    showPage(2)

    const wrapper = await mountSuspended(CategoryChips, { route: false })

    expect(chips(wrapper)).toEqual([
      [`${own(wrapper, 'all_in', { name: 'Φόρτιση' })} 16`, '/products/category/2/category-2', 'page'],
      ['Καλώδια 10', '/products/category/3/category-3', null],
      ['Φορτιστές 6', '/products/category/4/category-4', null],
    ])
  })

  it('lists a leaf\'s siblings, the leaf current and the first chip going back up', async () => {
    showPage(4)

    const wrapper = await mountSuspended(CategoryChips, { route: false })

    expect(chips(wrapper)).toEqual([
      [`${own(wrapper, 'all_in', { name: 'Φόρτιση' })} 16`, '/products/category/2/category-2', null],
      ['Καλώδια 10', '/products/category/3/category-3', null],
      ['Φορτιστές 6', '/products/category/4/category-4', 'page'],
    ])
  })

  it('draws no counts while the facet is unknown', async () => {
    showPage(undefined, null)

    const wrapper = await mountSuspended(CategoryChips, { route: false })

    expect(chips(wrapper).map(([label]) => label)).toEqual([own(wrapper, 'all_products'), 'Φόρτιση', 'Ήχος'])
  })

  it('draws nothing for a store with no categories', async () => {
    tree.forest.value = []

    const wrapper = await mountSuspended(CategoryChips, { route: false })

    expect(wrapper.find('nav').exists()).toBe(false)
  })
})
