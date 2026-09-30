import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import CategoryFilter from '~/components/Products/Filters/CategoryFilter.vue'
import WebsideCategoryFilter from '~/components/variants/webside/Products/Filters/CategoryFilter.vue'
import type { ProductCategory } from '~~/shared/openapi/types.gen'
import { makeCategory } from '~~/test/fixtures/productFilters'
import { trees } from '~~/test/helpers/trees'

/**
 * The category list reads its names through parler `translations`
 * (`extractTranslated`), so the fixtures carry them — the old fixture's
 * top-level `name` rendered the empty state in every test. A category
 * with no products under the other filters is shown but cannot be
 * picked; a picked one can always be un-picked.
 */
const pf = await vi.hoisted(async () =>
  (await import('~~/test/fixtures/productFilters')).createProductFiltersMock())
mockNuxtImport('useProductFilters', () => () => pf)

const data = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return {
    allCategories: ref<ProductCategory[] | undefined>(undefined),
    categoriesStatus: ref<'idle' | 'pending' | 'success' | 'error'>('success'),
    categoryFacets: ref<Record<string, number>>({}),
  }
})
mockNuxtImport('useProductSearchData', () => () => data)

const ELECTRONICS = makeCategory({ id: 1, name: { el: 'Ηλεκτρονικά', en: 'Electronics' } })
const CLOTHING = makeCategory({ id: 2, name: { el: 'Ρούχα', en: 'Clothing' } })
const BOOKS = makeCategory({ id: 3, name: { el: 'Βιβλία', en: 'Books' } })
const GARDEN = makeCategory({ id: 4, name: { el: 'Κήπος', en: 'Garden' } })

const own = (wrapper: VueWrapper, key: string): string =>
  (wrapper.vm as unknown as { t: (k: string) => string }).t(key)

const categoryButtons = (wrapper: VueWrapper) => wrapper.findAll('button[aria-pressed]')

/** A category button's name: its accessible name reads `<name> - <count> <products>`. */
const nameOf = (b: ReturnType<VueWrapper['find']>) => b.attributes('aria-label')!.split(' - ')[0]

/** The listed categories, in order, by name. */
const listedNames = (wrapper: VueWrapper) => categoryButtons(wrapper).map(nameOf)

const button = (wrapper: VueWrapper, name: string) => {
  const found = categoryButtons(wrapper).find(b => nameOf(b) === name)
  expect(found, `no category button named ${name}`).toBeDefined()
  return found!
}

describe.each(trees(CategoryFilter, WebsideCategoryFilter))('$tree Products/Filters/CategoryFilter', ({ C }) => {
  beforeEach(() => {
    pf.reset()
    data.allCategories.value = [ELECTRONICS, CLOTHING, BOOKS, GARDEN]
    data.categoriesStatus.value = 'success'
    data.categoryFacets.value = { 1: 15, 2: 8, 3: 0, 4: 8 }
  })

  it('lists every category by its name in the page locale, the most stocked first', async () => {
    const wrapper = await mountSuspended(C, { route: false })

    // 2 and 4 tie on 8 products and keep their tree order.
    expect(listedNames(wrapper)).toEqual(['Ηλεκτρονικά', 'Ρούχα', 'Κήπος', 'Βιβλία'])
    expect(button(wrapper, 'Ηλεκτρονικά').attributes('aria-label'))
      .toBe(`Ηλεκτρονικά - 15 ${own(wrapper, 'products')}`)
  })

  it('lists the picked categories first, whatever their counts', async () => {
    pf.filters.value.categories = ['4']

    const wrapper = await mountSuspended(C, { route: false })

    expect(listedNames(wrapper)).toEqual(['Κήπος', 'Ηλεκτρονικά', 'Ρούχα', 'Βιβλία'])
    expect(button(wrapper, 'Κήπος').attributes('aria-pressed')).toBe('true')
    expect(button(wrapper, 'Ρούχα').attributes('aria-pressed')).toBe('false')
  })

  it('adds a category to the selection', async () => {
    pf.filters.value.categories = ['1']
    const wrapper = await mountSuspended(C, { route: false })

    await button(wrapper, 'Ρούχα').trigger('click')

    expect(pf.updateFilters).toHaveBeenCalledExactlyOnceWith({ categories: ['1', '2'] })
  })

  it('takes a picked category out of the selection', async () => {
    pf.filters.value.categories = ['1', '2']
    const wrapper = await mountSuspended(C, { route: false })

    await button(wrapper, 'Ηλεκτρονικά').trigger('click')

    expect(pf.updateFilters).toHaveBeenCalledExactlyOnceWith({ categories: ['2'] })
  })

  it('shows a category with no matching products but will not pick it', async () => {
    const wrapper = await mountSuspended(C, { route: false })

    const books = button(wrapper, 'Βιβλία')
    expect(books.attributes('disabled')).toBeDefined()
    await books.trigger('click')

    expect(pf.updateFilters).not.toHaveBeenCalled()
  })

  it('lets a picked category go even after its count dropped to zero', async () => {
    pf.filters.value.categories = ['3']
    const wrapper = await mountSuspended(C, { route: false })

    const books = button(wrapper, 'Βιβλία')
    expect(books.attributes('disabled')).toBeUndefined()
    await books.trigger('click')

    expect(pf.updateFilters).toHaveBeenCalledExactlyOnceWith({ categories: [] })
  })

  it('treats a category missing from the facets as empty, with no count badge', async () => {
    data.categoryFacets.value = { 1: 15 }

    const wrapper = await mountSuspended(C, { route: false })

    const clothing = button(wrapper, 'Ρούχα')
    expect(clothing.attributes('disabled')).toBeDefined()
    expect(clothing.text()).toBe('Ρούχα')
    expect(button(wrapper, 'Ηλεκτρονικά').text()).toBe('Ηλεκτρονικά15')
  })

  it('narrows the list to the names containing the search, ignoring case', async () => {
    const wrapper = await mountSuspended(C, { route: false })

    await wrapper.find('input').setValue('ΡΟΎ')

    expect(listedNames(wrapper)).toEqual(['Ρούχα'])
  })

  it('shows the empty state when the search matches nothing, and the clear button brings the list back', async () => {
    const wrapper = await mountSuspended(C, { route: false })

    await wrapper.find('input').setValue('zzz')
    expect(categoryButtons(wrapper)).toHaveLength(0)
    expect(wrapper.text()).toContain(own(wrapper, 'no_categories'))

    await wrapper.find(`button[aria-label="${own(wrapper, 'clear_search')}"]`).trigger('click')

    expect(listedNames(wrapper)).toHaveLength(4)
  })

  it('shows skeletons instead of the list while the categories load', async () => {
    data.categoriesStatus.value = 'pending'

    const wrapper = await mountSuspended(C, { route: false })

    expect(categoryButtons(wrapper)).toHaveLength(0)
    expect(wrapper.findAllComponents({ name: 'USkeleton' })).toHaveLength(6)
    expect(wrapper.text()).not.toContain(own(wrapper, 'no_categories'))
  })

  it('shows the empty state when the store has no categories', async () => {
    data.allCategories.value = []

    const wrapper = await mountSuspended(C, { route: false })

    expect(categoryButtons(wrapper)).toHaveLength(0)
    expect(wrapper.text()).toContain(own(wrapper, 'no_categories'))
  })
})
