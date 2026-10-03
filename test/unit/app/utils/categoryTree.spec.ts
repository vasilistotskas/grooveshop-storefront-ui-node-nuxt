import { describe, it, expect } from 'vitest'
import { buildCategoryForest, categoryTrail, categoryUrl } from '~/utils/categoryTree'
import { makeCategory } from '~~/test/fixtures/productFilters'

/**
 * Charging (2) holds Cables (3) and Chargers (4); Audio (5) is a second
 * root. Products are filed under the leaves, so the facet has no entry
 * for Charging itself.
 */
const CHARGING = makeCategory({ id: 2, name: { el: 'Φόρτιση', en: 'Charging' } })
const CABLES = makeCategory({ id: 3, parent: 2, level: 1, treeId: 2, name: { el: 'Καλώδια', en: 'Cables' } })
const CHARGERS = makeCategory({ id: 4, parent: 2, level: 1, treeId: 2, name: { el: 'Φορτιστές', en: 'Chargers' } })
const AUDIO = makeCategory({ id: 5, name: { el: 'Ήχος', en: 'Audio' } })
const CATEGORIES = [CABLES, CHARGING, AUDIO, CHARGERS]

describe('buildCategoryForest', () => {
  it('nests children under their parent in list order and sums the facet over each subtree', () => {
    const forest = buildCategoryForest(CATEGORIES, 'en', { 3: 10, 4: 6, 5: 9 })

    expect(forest.map(node => [node.label, node.count])).toEqual([['Charging', 16], ['Audio', 9]])
    expect(forest[0]!.children.map(node => [node.label, node.count, node.to])).toEqual([
      ['Cables', 10, '/products/category/3/category-3'],
      ['Chargers', 6, '/products/category/4/category-4'],
    ])
  })

  it('names nodes in the requested locale', () => {
    expect(buildCategoryForest([AUDIO], 'el', { 5: 1 })[0]!.label).toBe('Ήχος')
  })

  it('leaves out a category with no products', () => {
    const forest = buildCategoryForest(CATEGORIES, 'en', { 3: 10, 4: 0, 5: 0 })

    expect(forest.map(node => node.label)).toEqual(['Charging'])
    expect(forest[0]!.children.map(node => node.label)).toEqual(['Cables'])
  })

  it('keeps the current category and its ancestors when a filter empties them', () => {
    const forest = buildCategoryForest(CATEGORIES, 'en', { 3: 0, 4: 0, 5: 2 }, 4)

    expect(forest.map(node => node.label)).toEqual(['Charging', 'Audio'])
    expect(forest[0]!.children.map(node => node.label)).toEqual(['Chargers'])
  })

  it('prunes nothing and counts nothing while the facet is unknown', () => {
    const forest = buildCategoryForest(CATEGORIES, 'en', undefined)

    expect(forest.map(node => [node.label, node.count])).toEqual([['Charging', null], ['Audio', null]])
    expect(forest[0]!.children).toHaveLength(2)
  })

  it('drops an inactive category with everything under it', () => {
    const forest = buildCategoryForest([{ ...CHARGING, active: false }, CABLES, AUDIO], 'en', { 3: 4, 5: 1 })

    expect(forest.map(node => node.label)).toEqual(['Audio'])
  })
})

describe('categoryTrail', () => {
  const forest = buildCategoryForest(CATEGORIES, 'en', { 3: 10, 4: 6, 5: 9 })

  it('walks from the root down to the category', () => {
    expect(categoryTrail(forest, 4).map(node => node.id)).toEqual([2, 4])
    expect(categoryTrail(forest, 5).map(node => node.id)).toEqual([5])
  })

  it('is empty for a category the forest does not hold', () => {
    expect(categoryTrail(forest, 99)).toEqual([])
  })
})

describe('categoryUrl', () => {
  it('is the listing path before the locale prefix', () => {
    expect(categoryUrl(7, 'cases')).toBe('/products/category/7/cases')
  })
})
