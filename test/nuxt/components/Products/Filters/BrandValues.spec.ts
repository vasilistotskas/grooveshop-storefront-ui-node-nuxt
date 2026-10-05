import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import BrandValues from '~/components/Products/Filters/BrandValues.vue'
import type { BrandOption } from '~/utils/brandOptions'

/**
 * The brands as checkboxes. A tick writes the URL's `brand` list: it
 * adds its id and keeps the others, an untick takes only its own id out.
 */
const pf = await vi.hoisted(async () =>
  (await import('~~/test/fixtures/productFilters')).createProductFiltersMock())
mockNuxtImport('useProductFilters', () => () => pf)

const OPTIONS: BrandOption[] = [
  { id: '3', label: 'Kabelo', count: 10, selected: true },
  { id: '7', label: 'Voltra', count: 14, selected: false },
]

const mountBrands = () => mountSuspended(BrandValues, { route: false, props: { options: OPTIONS } })

const box = (wrapper: VueWrapper, label: string) => {
  const item = wrapper.findAll('li').find(li => li.text().startsWith(label))
  expect(item, `no brand "${label}"`).toBeDefined()
  return item!.find('[role="checkbox"]')
}

describe('Products/Filters/BrandValues', () => {
  beforeEach(() => {
    pf.reset()
    pf.filters.value = { ...pf.filters.value, brands: ['3', '5'] }
  })

  it('lists each brand with its count, ticked where the URL selects it', async () => {
    const wrapper = await mountBrands()

    expect(wrapper.findAll('li').map(li => li.findAll('span').map(span => span.text()).filter(Boolean))).toEqual([
      ['Kabelo', '10'],
      ['Voltra', '14'],
    ])
    expect(box(wrapper, 'Kabelo').attributes('aria-checked')).toBe('true')
    expect(box(wrapper, 'Voltra').attributes('aria-checked')).toBe('false')
  })

  it('adds a ticked brand and keeps the others', async () => {
    const wrapper = await mountBrands()

    await box(wrapper, 'Voltra').trigger('click')

    expect(pf.updateFilters).toHaveBeenCalledExactlyOnceWith({ brands: ['3', '5', '7'] })
  })

  it('takes an unticked brand out and keeps the others', async () => {
    const wrapper = await mountBrands()

    await box(wrapper, 'Kabelo').trigger('click')

    expect(pf.updateFilters).toHaveBeenCalledExactlyOnceWith({ brands: ['5'] })
  })
})
