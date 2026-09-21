import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ProductsToolbar from '~/components/Products/Toolbar.vue'

/**
 * Picking a page size has to actually change the page size.
 *
 * `USelect` hands back the `value-key`'d value as a STRING — Reka's
 * select stores strings, and getting a number out needs the `number`
 * model modifier, which is only reachable through `v-model`. This
 * toolbar binds `:model-value` + `@update:model-value`, so the handler
 * received `"24"`, its `typeof value === 'number'` guard rejected it,
 * and the control silently did nothing: measured on staging, the list
 * stayed at 12 products whichever option was picked, and `?pageSize=`
 * and `?limit=` made no difference either.
 *
 * The sort select beside it expects a STRING and has always worked,
 * which is what made the difference visible.
 *
 * The assertion is on the EMIT, because that is the contract the list
 * consumes: `handleItemsPerPageChange(value: number)` assigns straight
 * to `limit`, and a string there would poison the query.
 */
const props = {
  totalResults: 55,
  currentSort: '',
  itemsPerPage: 12,
  hasActiveFilters: false,
  activeFilterCount: 0,
}

describe('the items-per-page control', () => {
  it('emits a NUMBER when the select hands back a string', async () => {
    const wrapper = await mountSuspended(ProductsToolbar, { props })

    const selects = wrapper.findAllComponents({ name: 'USelect' })
    expect(selects.length, 'expected a sort select and a page-size one').toBeGreaterThanOrEqual(2)

    // The page-size select is the one whose current value is the page size.
    const pageSize = selects.find(s => s.props('modelValue') === 12) ?? selects[1]!
    pageSize.vm.$emit('update:modelValue', '24')
    await wrapper.vm.$nextTick()

    const emitted = wrapper.emitted('update:itemsPerPage')
    expect(emitted, 'the control emitted nothing — the page size never changes').toBeTruthy()
    expect(emitted![0]![0]).toBe(24)
    expect(typeof emitted![0]![0]).toBe('number')

    wrapper.unmount()
  })

  it('ignores a value that is not a usable page size', async () => {
    const wrapper = await mountSuspended(ProductsToolbar, { props })
    const selects = wrapper.findAllComponents({ name: 'USelect' })
    const pageSize = selects.find(s => s.props('modelValue') === 12) ?? selects[1]!

    for (const junk of ['', 'all', null, undefined, '0', '-5']) {
      pageSize.vm.$emit('update:modelValue', junk)
    }
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:itemsPerPage')).toBeFalsy()
    wrapper.unmount()
  })
})
