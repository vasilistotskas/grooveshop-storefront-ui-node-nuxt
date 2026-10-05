import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import Availability from '~/components/Products/Filters/Availability.vue'

/**
 * The two availability switches: each one writes its own flag to the
 * URL and leaves the other alone, and each shows the flag the URL holds.
 */
const pf = await vi.hoisted(async () =>
  (await import('~~/test/fixtures/productFilters')).createProductFiltersMock())
mockNuxtImport('useProductFilters', () => () => pf)

const mountAvailability = () => mountSuspended(Availability, { route: false })

/** A switch by the words beside it. */
const switchOf = (wrapper: VueWrapper, label: string) => {
  const item = wrapper.findAll('li').find(li => li.text() === label)
  expect(item, `no switch "${label}"`).toBeDefined()
  return item!.get('[role="switch"]')
}

describe('Products/Filters/Availability', () => {
  beforeEach(() => {
    pf.reset()
  })

  it('shows both switches off with no availability filter in the URL', async () => {
    const wrapper = await mountAvailability()

    expect(switchOf(wrapper, 'Μόνο σε απόθεμα').attributes('aria-checked')).toBe('false')
    expect(switchOf(wrapper, 'Σε προσφορά').attributes('aria-checked')).toBe('false')
  })

  it('shows on the switch the URL has on, and only that one', async () => {
    pf.filters.value = { ...pf.filters.value, onOffer: true }

    const wrapper = await mountAvailability()

    expect(switchOf(wrapper, 'Μόνο σε απόθεμα').attributes('aria-checked')).toBe('false')
    expect(switchOf(wrapper, 'Σε προσφορά').attributes('aria-checked')).toBe('true')
  })

  it('turns in stock on without touching on offer', async () => {
    const wrapper = await mountAvailability()

    await switchOf(wrapper, 'Μόνο σε απόθεμα').trigger('click')

    expect(pf.updateFilters).toHaveBeenCalledExactlyOnceWith({ inStock: true })
  })

  it('turns on offer off from its own switch', async () => {
    pf.filters.value = { ...pf.filters.value, inStock: true, onOffer: true }
    const wrapper = await mountAvailability()

    await switchOf(wrapper, 'Σε προσφορά').trigger('click')

    expect(pf.updateFilters).toHaveBeenCalledExactlyOnceWith({ onOffer: false })
  })
})
