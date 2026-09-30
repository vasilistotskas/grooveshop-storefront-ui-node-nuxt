import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import ProductsToolbar from '~/components/Products/Toolbar.vue'

/**
 * The bar above the product grid. Default tree only: the webside
 * toolbar is a different component (its own labels, no chip list).
 *
 * Picking a page size has to actually change the page size. `USelect`
 * hands back the `value-key`'d value as a STRING — Reka's select stores
 * strings, and getting a number out needs the `number` model modifier,
 * which is only reachable through `v-model`. This toolbar binds
 * `:model-value` + `@update:model-value`, so the handler received
 * `"24"`, its old `typeof value === 'number'` guard rejected it, and the
 * control silently did nothing: measured on staging, the list stayed at
 * 12 products whichever option was picked. The assertion is on the
 * EMIT, because that is the contract the list consumes.
 *
 * The selects are driven through their `update:modelValue` event: the
 * options live in a Reka portal the harness does not lay out.
 */
const props = {
  totalResults: 55,
  currentSort: '',
  itemsPerPage: 12,
  hasActiveFilters: false,
  activeFilterCount: 0,
}

// The chip list reads the URL filters and the search facets; it has its own spec.
const mountToolbar = (overrides: Partial<typeof props> = {}) =>
  mountSuspended(ProductsToolbar, {
    route: false,
    props: { ...props, ...overrides },
    global: { stubs: { ProductsFiltersActiveFilters: true } },
  })

/** The component's own `<i18n>` messages; the app-level `$i18n.t` cannot see a component-scoped block. */
const own = (wrapper: VueWrapper, key: string, params: Record<string, unknown> = {}): string =>
  (wrapper.vm as unknown as { t: (k: string, p: Record<string, unknown>) => string }).t(key, params)

/** A select by its accessible name — fails loudly rather than falling back to a position. */
function select(wrapper: VueWrapper, key: 'sort_products' | 'items_per_page') {
  const label = own(wrapper, `toolbar.aria.${key}`)
  const found = wrapper.findAllComponents({ name: 'USelect' }).filter(s => s.find(`[aria-label="${label}"]`).exists())
  expect(found, `expected one select labelled "${label}"`).toHaveLength(1)
  return found[0]!
}

const toggleButton = (wrapper: VueWrapper) =>
  wrapper.find(`button[aria-label="${own(wrapper, 'toolbar.aria.toggle_filters')}"]`)

describe('Products/Toolbar', () => {
  it('announces the result count with the locale\'s thousands separator', async () => {
    const wrapper = await mountToolbar({ totalResults: 1234 })

    const count = new Intl.NumberFormat('el').format(1234)
    expect(wrapper.find('[role="status"]').text()).toBe(own(wrapper, 'resultsCount', { count }))
  })

  describe('the sort control', () => {
    it('shows the store\'s own order as "recommended" when the URL has no sort', async () => {
      const wrapper = await mountToolbar()

      expect(select(wrapper, 'sort_products').text()).toContain(own(wrapper, 'sort.recommended'))
    })

    it.each([
      ['a sort field as-is', '-finalPrice', '-finalPrice'],
      ['"recommended" as no sort at all', 'recommended', ''],
    ])('emits %s', async (_case, picked, emitted) => {
      const wrapper = await mountToolbar({ currentSort: '-createdAt' })

      select(wrapper, 'sort_products').vm.$emit('update:modelValue', picked)
      await nextTick()

      expect(wrapper.emitted('update:sort')).toEqual([[emitted]])
    })

    it('ignores a value that is not a sort', async () => {
      const wrapper = await mountToolbar()

      select(wrapper, 'sort_products').vm.$emit('update:modelValue', 24)
      await nextTick()

      expect(wrapper.emitted('update:sort')).toBeUndefined()
    })
  })

  describe('the items-per-page control', () => {
    it('emits a NUMBER when the select hands back a string', async () => {
      const wrapper = await mountToolbar()

      select(wrapper, 'items_per_page').vm.$emit('update:modelValue', '24')
      await nextTick()

      expect(wrapper.emitted('update:itemsPerPage')).toStrictEqual([[24]])
    })

    it('ignores a value that is not a usable page size', async () => {
      const wrapper = await mountToolbar()
      const pageSize = select(wrapper, 'items_per_page')

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

      await toggleButton(wrapper).trigger('click')

      expect(wrapper.emitted('toggle-filters')).toEqual([[]])
    })

    it('counts the active filters on the drawer button and lists them under the bar', async () => {
      const wrapper = await mountToolbar({ hasActiveFilters: true, activeFilterCount: 3 })

      expect(toggleButton(wrapper).text()).toBe(`${own(wrapper, 'filters')}3`)
      expect(wrapper.findComponent({ name: 'ProductsFiltersActiveFilters' }).exists()).toBe(true)
    })

    it('shows no count and no chip list without active filters', async () => {
      const wrapper = await mountToolbar()

      expect(toggleButton(wrapper).text()).toBe(own(wrapper, 'filters'))
      expect(wrapper.findComponent({ name: 'ProductsFiltersActiveFilters' }).exists()).toBe(false)
    })
  })
})
