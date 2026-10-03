import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import ProductsToolbar from '~/components/Products/Toolbar.vue'
import WebsideProductsToolbar from '~/components/variants/webside/Products/Toolbar.vue'

/**
 * The bar above the product grid. The webside toolbar is a different
 * component (its own labels, no chip list); its page-size control is
 * covered at the end of this file.
 *
 * Picking a page size has to actually change the page size. `USelect`
 * hands back the `value-key`'d value as a STRING — Reka's select stores
 * strings, and getting a number out needs the `number` model modifier,
 * which is only reachable through `v-model`. This toolbar binds
 * `:model-value` + `@update:model-value`, so the handler receives
 * `"24"`; the assertion is on the EMIT, because that is the contract
 * the list consumes.
 *
 * The selects are driven through their `update:modelValue` event: the
 * options live in a Reka portal the harness does not lay out. Wide and
 * narrow screens each have their own sort select, shown by CSS.
 */
const pf = await vi.hoisted(async () =>
  (await import('~~/test/fixtures/productFilters')).createProductFiltersMock())
mockNuxtImport('useProductFilters', () => () => pf)

const props = {
  totalResults: 55,
  currentSort: '',
  itemsPerPage: 12,
}

// The chip list reads the URL filters and the search facets; it has its own spec.
const mountToolbar = (overrides: Partial<typeof props> = {}) =>
  mountSuspended(ProductsToolbar, {
    route: false,
    props: { ...props, ...overrides },
    global: { stubs: { ProductsFiltersActiveFilters: true } },
  })

/** The component's own `<i18n>` messages; the app-level `$i18n.t` cannot see a component-scoped block. */
const own = (wrapper: VueWrapper, key: string, params: Record<string, unknown> = {}, plural?: number): string => {
  const { t } = wrapper.vm as unknown as { t: (k: string, ...args: unknown[]) => string }
  return plural === undefined ? t(key, params) : t(key, plural, { named: params })
}

/** The selects with this accessible name, wide first. */
function selects(wrapper: VueWrapper, key: 'sort_products' | 'items_per_page') {
  const label = own(wrapper, key)
  return wrapper.findAllComponents({ name: 'USelect' }).filter(s => s.find(`[aria-label="${label}"]`).exists())
}

/** The narrow screen's way into the filters, by the start of its accessible name. */
const filterButton = (wrapper: VueWrapper) => {
  const button = wrapper.find(`button[aria-label^="${own(wrapper, 'open_filters')}"]`)
  expect(button.exists(), 'no filter button').toBe(true)
  return button
}

describe('default Products/Toolbar', () => {
  beforeEach(() => {
    pf.reset()
  })

  it('counts the results with the locale\'s thousands separator, in both frames', async () => {
    const wrapper = await mountToolbar({ totalResults: 1234 })

    const count = new Intl.NumberFormat('el').format(1234)
    const text = own(wrapper, 'resultsCount', { count }, 1234)
    expect(wrapper.findAll('p').filter(p => p.text() === text)).toHaveLength(2)
  })

  it('says one product in the singular', async () => {
    const wrapper = await mountToolbar({ totalResults: 1 })

    expect(wrapper.find('p').text()).toBe(own(wrapper, 'resultsCount', { count: '1' }, 1))
  })

  describe('the sort control', () => {
    it('reads "Sort: Featured" on a wide screen when the URL has no sort', async () => {
      const wrapper = await mountToolbar()

      const [wide] = selects(wrapper, 'sort_products')
      expect(wide!.text()).toBe(own(wrapper, 'sort_by', { sort: own(wrapper, 'sort.recommended') }))
    })

    it.each([
      ['a sort field as-is', '-finalPrice', '-finalPrice'],
      ['"recommended" as no sort at all', 'recommended', ''],
    ])('emits %s from either frame', async (_case, picked, emitted) => {
      const wrapper = await mountToolbar({ currentSort: '-createdAt' })

      for (const control of selects(wrapper, 'sort_products')) control.vm.$emit('update:modelValue', picked)
      await nextTick()

      expect(wrapper.emitted('update:sort')).toEqual([[emitted], [emitted]])
    })

    it('ignores a value that is not a sort', async () => {
      const wrapper = await mountToolbar()

      selects(wrapper, 'sort_products')[0]!.vm.$emit('update:modelValue', 24)
      await nextTick()

      expect(wrapper.emitted('update:sort')).toBeUndefined()
    })
  })

  describe('the items-per-page control', () => {
    it('emits a NUMBER when the select hands back a string', async () => {
      const wrapper = await mountToolbar()

      selects(wrapper, 'items_per_page')[0]!.vm.$emit('update:modelValue', '24')
      await nextTick()

      expect(wrapper.emitted('update:itemsPerPage')).toStrictEqual([[24]])
    })

    it('ignores a value that is not a usable page size', async () => {
      const wrapper = await mountToolbar()
      const pageSize = selects(wrapper, 'items_per_page')[0]!

      for (const junk of ['', 'all', null, undefined, '0', '-5']) {
        pageSize.vm.$emit('update:modelValue', junk)
      }
      await nextTick()

      expect(wrapper.emitted('update:itemsPerPage')).toBeUndefined()
    })
  })

  describe('the filters', () => {
    it('opens the filter drawer from its button', async () => {
      const wrapper = await mountToolbar()

      await filterButton(wrapper).trigger('click')

      expect(wrapper.emitted('toggle-filters')).toEqual([[]])
    })

    it('counts the filters a shopper set on the drawer button, never the sort', async () => {
      pf.activeFilterChips.value = [
        { key: 'attributeValues', type: 'attribute', label: 'a', value: '7' },
        { key: 'priceMin', type: 'price', label: 'p', value: { min: 10, max: 60 } },
        { key: 'sort', type: 'sort', label: 's', value: '-finalPrice' },
      ]

      const wrapper = await mountToolbar()

      expect(filterButton(wrapper).attributes('aria-label')).toBe(own(wrapper, 'open_filters_n', { count: 2 }))
      expect(filterButton(wrapper).text()).toBe(`${own(wrapper, 'filters')}2`)
    })

    it('clears the filters and keeps the sort from the narrow screen\'s "Clear filters"', async () => {
      pf.activeFilterChips.value = [{ key: 'attributeValues', type: 'attribute', label: 'a', value: '7' }]
      const wrapper = await mountToolbar()

      const clear = wrapper.findAll('button').find(button => button.text() === own(wrapper, 'clear_filters'))
      await clear!.trigger('click')

      expect(pf.updateFilters).toHaveBeenCalledExactlyOnceWith(CLEARED_FILTERS)
    })

    it('offers no count and nothing to clear with only a sort set', async () => {
      pf.activeFilterChips.value = [{ key: 'sort', type: 'sort', label: 's', value: '-finalPrice' }]

      const wrapper = await mountToolbar()

      expect(filterButton(wrapper).text()).toBe(own(wrapper, 'filters'))
      expect(wrapper.findAll('button').some(button => button.text() === own(wrapper, 'clear_filters'))).toBe(false)
    })
  })
})

/**
 * The webside toolbar is its own component, with the same page-size
 * select and the same `:model-value` + `@update:model-value` binding —
 * so the same string. Its `typeof value === 'number'` guard rejected it:
 * measured on webside.gr in production (2026-10-01), picking 24 left the
 * select at 12 and the URL untouched, while the sort select beside it
 * worked through the same clicks.
 */
describe('webside Products/Toolbar: the items-per-page control', () => {
  const mountWebside = () => mountSuspended(WebsideProductsToolbar, { route: false, props })

  /** The webside select by its accessible name — fails loudly rather than falling back to a position. */
  function select(wrapper: VueWrapper, key: 'items_per_page') {
    const label = own(wrapper, `toolbar.aria.${key}`)
    const found = wrapper.findAllComponents({ name: 'USelect' }).filter(s => s.find(`[aria-label="${label}"]`).exists())
    expect(found, `expected one select labelled "${label}"`).toHaveLength(1)
    return found[0]!
  }

  it('emits a NUMBER when the select hands back a string', async () => {
    const wrapper = await mountWebside()

    select(wrapper, 'items_per_page').vm.$emit('update:modelValue', '24')
    await nextTick()

    expect(wrapper.emitted('update:itemsPerPage')).toStrictEqual([[24]])
  })

  it('ignores a value that is not a usable page size', async () => {
    const wrapper = await mountWebside()
    const pageSize = select(wrapper, 'items_per_page')

    for (const junk of ['', 'all', null, undefined, '0', '-5']) {
      pageSize.vm.$emit('update:modelValue', junk)
    }
    await nextTick()

    expect(wrapper.emitted('update:itemsPerPage')).toBeUndefined()
  })
})
