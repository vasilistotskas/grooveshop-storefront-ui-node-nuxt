import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import BrandFilter from '~/components/variants/webside/Products/Filters/BrandFilter.vue'
import type { BrandOption } from '~/utils/brandOptions'

/**
 * Webside's brand rows. A click writes the URL's `brand` list: it adds
 * its id and keeps the others, a second click takes only its own id out.
 */
const pf = await vi.hoisted(async () =>
  (await import('~~/test/fixtures/productFilters')).createProductFiltersMock())
mockNuxtImport('useProductFilters', () => () => pf)

const OPTIONS: BrandOption[] = [
  { id: '3', label: 'Kabelo', count: 10, selected: true },
  { id: '7', label: 'Voltra', count: 14, selected: false },
]

const mountBrands = () => mountSuspended(BrandFilter, { route: false, props: { options: OPTIONS } })

const row = (wrapper: VueWrapper, label: string) => {
  const found = wrapper.findAll('button').find(button => button.text().startsWith(label))
  expect(found, `no brand "${label}"`).toBeDefined()
  return found!
}

describe('webside Products/Filters/BrandFilter', () => {
  beforeEach(() => {
    pf.reset()
    pf.filters.value = { ...pf.filters.value, brands: ['3', '5'] }
  })

  it('lists each brand with its count, pressed where the URL selects it', async () => {
    const wrapper = await mountBrands()

    expect(wrapper.findAll('button').map(button => button.text())).toEqual(['Kabelo10', 'Voltra14'])
    expect(row(wrapper, 'Kabelo').attributes('aria-pressed')).toBe('true')
    expect(row(wrapper, 'Voltra').attributes('aria-pressed')).toBe('false')
  })

  it('adds a brand and keeps the others', async () => {
    const wrapper = await mountBrands()

    await row(wrapper, 'Voltra').trigger('click')

    expect(pf.updateFilters).toHaveBeenCalledExactlyOnceWith({ brands: ['3', '5', '7'] })
  })

  it('takes a selected brand out and keeps the others', async () => {
    const wrapper = await mountBrands()

    await row(wrapper, 'Kabelo').trigger('click')

    expect(pf.updateFilters).toHaveBeenCalledExactlyOnceWith({ brands: ['5'] })
  })
})
