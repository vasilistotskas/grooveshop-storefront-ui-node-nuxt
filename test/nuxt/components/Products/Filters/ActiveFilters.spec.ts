import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import ActiveFilters from '~/components/Products/Filters/ActiveFilters.vue'
import WebsideActiveFilters from '~/components/variants/webside/Products/Filters/ActiveFilters.vue'
import type { FilterChip } from '~~/shared/types/product-filters'

/**
 * The chip list's output is the filter it removes. The chips themselves
 * come from `useProductFilters` (its own spec derives them from the
 * URL); this spec feeds chips in and checks what each one shows and
 * which filter a click takes away. A category or attribute chip takes
 * ONE id out of a multi-select, so it must rewrite the list rather than
 * drop the whole filter.
 */
const pf = await vi.hoisted(async () =>
  (await import('~~/test/fixtures/productFilters')).createProductFiltersMock())
mockNuxtImport('useProductFilters', () => () => pf)

const CATEGORY_NAMES: Record<string, string> = { 1: 'Ηλεκτρονικά', 2: 'Βιβλία' }
const VALUE_NAMES: Record<string, string> = { 7: 'Κόκκινο', 8: 'Μπλε' }
mockNuxtImport('useProductSearchData', () => () => ({
  getCategoryName: (id: string) => CATEGORY_NAMES[id] ?? id,
  getAttributeValueName: (id: string) => VALUE_NAMES[id] ?? id,
}))

function showChips(...chips: FilterChip[]) {
  pf.activeFilterChips.value = chips
  pf.activeFilterCount.value = chips.length
}

/** The component's own `<i18n>` messages; the app-level `$i18n.t` cannot see a component-scoped block. */
const own = (wrapper: VueWrapper, key: string, params: Record<string, unknown> = {}): string =>
  (wrapper.vm as unknown as { t: (k: string, p: Record<string, unknown>) => string }).t(key, params)

/** A chip's remove button: its accessible name carries the chip's label. */
const removeButton = (wrapper: VueWrapper, label: string) => {
  const button = wrapper.find(`button[aria-label*="${label}"]`)
  expect(button.exists(), `no remove button for the "${label}" chip`).toBe(true)
  return button
}

/** What a chip displays: the text beside its remove button. */
const chipText = (wrapper: VueWrapper, label: string) =>
  removeButton(wrapper, label).element.parentElement!.textContent!.trim()

describe('webside Products/Filters/ActiveFilters', () => {
  const C = WebsideActiveFilters

  beforeEach(() => {
    pf.reset()
  })

  it('renders nothing while no filter is active', async () => {
    const wrapper = await mountSuspended(C, { route: false })

    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })

  it('shows a chip for each active filter under the header', async () => {
    showChips(
      { key: 'search', type: 'search', label: 'search-chip', value: 'laptop' },
      { key: 'categories', type: 'category', label: 'category-chip', value: '1' },
    )

    const wrapper = await mountSuspended(C, { route: false })

    expect(wrapper.find('h3').text()).toBe(own(wrapper, 'active_filters'))
    expect(chipText(wrapper, 'search-chip')).toBe('"laptop"')
    expect(chipText(wrapper, 'category-chip')).toBe('Ηλεκτρονικά')
  })

  describe('chip values', () => {
    it.each<[string, FilterChip, (w: VueWrapper, n: (v: number) => string) => string]>([
      ['a full price range as from – to', { key: 'priceMin', type: 'price', label: 'c', value: { min: 10, max: 50 } }, (_w, n) => `${n(10)} – ${n(50)}`],
      ['a floor-only price as from+', { key: 'priceMin', type: 'price', label: 'c', value: { min: 10, max: undefined } }, (_w, n) => `${n(10)}+`],
      ['a ceiling-only price as up to', { key: 'priceMin', type: 'price', label: 'c', value: { min: undefined, max: 50 } }, (w, n) => own(w, 'up_to', { price: n(50) })],
      ['a likes minimum', { key: 'likesMin', type: 'likes', label: 'c', value: 5 }, w => own(w, 'min_likes', { count: 5 })],
      ['a views minimum', { key: 'viewsMin', type: 'views', label: 'c', value: 100 }, w => own(w, 'min_views', { count: 100 })],
      ['a category by its name', { key: 'categories', type: 'category', label: 'c', value: '2' }, () => 'Βιβλία'],
      ['an unknown category by its id', { key: 'categories', type: 'category', label: 'c', value: '99' }, () => '99'],
      ['an attribute value by its name', { key: 'attributeValues', type: 'attribute', label: 'c', value: '7' }, () => 'Κόκκινο'],
      ['a known sort by its label', { key: 'sort', type: 'sort', label: 'c', value: '-finalPrice' }, w => own(w, 'sort.price_desc')],
      ['an unknown sort as its raw value', { key: 'sort', type: 'sort', label: 'c', value: 'title' }, () => 'title'],
    ])('shows %s', async (_case, chip, expected) => {
      showChips(chip)
      const n = (value: number) => useNuxtApp().$i18n.n(value, 'currency')

      const wrapper = await mountSuspended(C, { route: false })

      expect(chipText(wrapper, 'c')).toBe(expected(wrapper, n))
    })
  })

  describe('removing a chip', () => {
    it('takes one category out of the selection, keeping the others', async () => {
      pf.filters.value.categories = ['1', '2']
      showChips(
        { key: 'categories', type: 'category', label: 'first', value: '1' },
        { key: 'categories', type: 'category', label: 'second', value: '2' },
      )
      const wrapper = await mountSuspended(C, { route: false })

      await removeButton(wrapper, 'first').trigger('click')

      expect(pf.updateFilters).toHaveBeenCalledExactlyOnceWith({ categories: ['2'] })
      expect(pf.removeFilter).not.toHaveBeenCalled()
    })

    it('takes one attribute value out of the selection, keeping the others', async () => {
      pf.filters.value.attributeValues = ['7', '8']
      showChips({ key: 'attributeValues', type: 'attribute', label: 'blue', value: '8' })
      const wrapper = await mountSuspended(C, { route: false })

      await removeButton(wrapper, 'blue').trigger('click')

      expect(pf.updateFilters).toHaveBeenCalledExactlyOnceWith({ attributeValues: ['7'] })
    })

    it('clears both ends of the price range with one chip', async () => {
      showChips({ key: 'priceMin', type: 'price', label: 'price', value: { min: 10, max: 50 } })
      const wrapper = await mountSuspended(C, { route: false })

      await removeButton(wrapper, 'price').trigger('click')

      // Strict: `updateFilters` clears a bound only when its KEY is
      // present (`'priceMax' in updates`), and `toEqual` treats a
      // missing key and an `undefined` one as the same.
      expect(pf.updateFilters.mock.calls).toStrictEqual([[{ priceMin: undefined, priceMax: undefined }]])
    })

    it.each<FilterChip>([
      { key: 'search', type: 'search', label: 'other', value: 'laptop' },
      { key: 'likesMin', type: 'likes', label: 'other', value: 5 },
      { key: 'viewsMin', type: 'views', label: 'other', value: 100 },
      { key: 'sort', type: 'sort', label: 'other', value: '-createdAt' },
    ])('removes the whole $key filter by its key', async (chip) => {
      showChips(chip)
      const wrapper = await mountSuspended(C, { route: false })

      await removeButton(wrapper, 'other').trigger('click')

      expect(pf.removeFilter).toHaveBeenCalledExactlyOnceWith(chip.key)
      expect(pf.updateFilters).not.toHaveBeenCalled()
    })
  })

  it('clears every filter from the header action', async () => {
    showChips({ key: 'search', type: 'search', label: 'search-chip', value: 'laptop' })
    const wrapper = await mountSuspended(C, { route: false })

    await wrapper.find(`button[aria-label="${own(wrapper, 'clear_all')}"]`).trigger('click')

    expect(pf.clearFilters).toHaveBeenCalledOnce()
    expect(pf.removeFilter).not.toHaveBeenCalled()
  })
})

/**
 * The default tree's chips sit inline beside the result count: no
 * heading, no sort chip (the sort has its own control), and "Clear
 * all" clears the filters while keeping the sort.
 */
describe('default Products/Filters/ActiveFilters', () => {
  const n = (value: number) => useNuxtApp().$i18n.n(value, 'currency')

  beforeEach(() => {
    pf.reset()
  })

  it('renders nothing while no filter is active', async () => {
    const wrapper = await mountSuspended(ActiveFilters, { route: false })

    expect(wrapper.find('ul').exists()).toBe(false)
  })

  it('renders nothing for a sort alone, and no chip for the sort beside filters', async () => {
    showChips({ key: 'sort', type: 'sort', label: 'sort', value: '-finalPrice' })
    const sortOnly = await mountSuspended(ActiveFilters, { route: false })
    expect(sortOnly.find('ul').exists()).toBe(false)
    sortOnly.unmount()

    showChips(
      { key: 'attributeValues', type: 'attribute', label: 'c', value: '7' },
      { key: 'sort', type: 'sort', label: 'sort', value: '-finalPrice' },
    )
    const wrapper = await mountSuspended(ActiveFilters, { route: false })

    expect(wrapper.findAll('li').map(item => item.text())).toEqual(['Κόκκινο', own(wrapper, 'clear_all')])
  })

  it.each<[string, FilterChip, (w: VueWrapper) => string]>([
    ['a full price range as from – to', { key: 'priceMin', type: 'price', label: 'c', value: { min: 10, max: 60 } }, () => `${n(10)} – ${n(60)}`],
    ['a floor-only price as from', { key: 'priceMin', type: 'price', label: 'c', value: { min: 10, max: undefined } }, w => own(w, 'from', { price: n(10) })],
    ['a ceiling-only price as up to', { key: 'priceMin', type: 'price', label: 'c', value: { min: undefined, max: 60 } }, w => own(w, 'up_to', { price: n(60) })],
    ['a category by its name', { key: 'categories', type: 'category', label: 'c', value: '2' }, () => 'Βιβλία'],
    ['an attribute value by its name', { key: 'attributeValues', type: 'attribute', label: 'c', value: '8' }, () => 'Μπλε'],
    ['a search in quotes', { key: 'search', type: 'search', label: 'c', value: 'cable' }, () => '“cable”'],
  ])('shows %s, and names it on its remove button', async (_case, chip, expected) => {
    showChips(chip)

    const wrapper = await mountSuspended(ActiveFilters, { route: false })

    const label = expected(wrapper)
    expect(wrapper.find('li').text()).toBe(label)
    expect(wrapper.find('li button').attributes('aria-label')).toBe(own(wrapper, 'remove', { filter: label }))
  })

  it('takes one attribute value out of the selection, keeping the others', async () => {
    pf.filters.value.attributeValues = ['7', '8']
    showChips({ key: 'attributeValues', type: 'attribute', label: 'c', value: '8' })
    const wrapper = await mountSuspended(ActiveFilters, { route: false })

    await wrapper.find('li button').trigger('click')

    expect(pf.updateFilters).toHaveBeenCalledExactlyOnceWith({ attributeValues: ['7'] })
  })

  it('clears both ends of the price range with one chip', async () => {
    showChips({ key: 'priceMin', type: 'price', label: 'c', value: { min: 10, max: 60 } })
    const wrapper = await mountSuspended(ActiveFilters, { route: false })

    await wrapper.find('li button').trigger('click')

    expect(pf.updateFilters.mock.calls).toStrictEqual([[{ priceMin: undefined, priceMax: undefined }]])
  })

  it('clears every filter and keeps the sort from "Clear all"', async () => {
    showChips({ key: 'search', type: 'search', label: 'c', value: 'cable' })
    const wrapper = await mountSuspended(ActiveFilters, { route: false })

    await wrapper.findAll('li').at(-1)!.find('button').trigger('click')

    expect(pf.updateFilters).toHaveBeenCalledExactlyOnceWith(CLEARED_FILTERS)
    expect(pf.clearFilters).not.toHaveBeenCalled()
  })
})
