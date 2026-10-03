import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import AttributeValues from '~/components/Products/Filters/AttributeValues.vue'
import type { AttributeGroup } from '~/utils/attributeGroups'

/**
 * One attribute's values as checkboxes. A tick writes the URL's
 * `attributeValue` list: it adds its id and keeps the others, an untick
 * takes only its own id out.
 */
const pf = await vi.hoisted(async () =>
  (await import('~~/test/fixtures/productFilters')).createProductFiltersMock())
mockNuxtImport('useProductFilters', () => () => pf)

const COLOUR: AttributeGroup = {
  id: 2,
  label: 'Χρώμα',
  options: [
    { id: '20', label: 'Μαύρο', count: 9, selected: true },
    { id: '21', label: 'Λευκό', count: 11, selected: false },
  ],
}

const mountGroup = () => mountSuspended(AttributeValues, { route: false, props: { group: COLOUR } })

/** A value's checkbox by its label. */
const box = (wrapper: VueWrapper, label: string) => {
  const item = wrapper.findAll('li').find(li => li.text().startsWith(label))
  expect(item, `no value "${label}"`).toBeDefined()
  return item!.find('[role="checkbox"]')
}

describe('Products/Filters/AttributeValues', () => {
  beforeEach(() => {
    pf.reset()
    pf.filters.value = { ...pf.filters.value, attributeValues: ['20', '7'] }
  })

  it('lists each value with its count, ticked where the URL selects it', async () => {
    const wrapper = await mountGroup()

    expect(wrapper.findAll('li').map(li => li.findAll('span').map(span => span.text()).filter(Boolean))).toEqual([
      ['Μαύρο', '9'],
      ['Λευκό', '11'],
    ])
    expect(box(wrapper, 'Μαύρο').attributes('aria-checked')).toBe('true')
    expect(box(wrapper, 'Λευκό').attributes('aria-checked')).toBe('false')
  })

  it('adds a ticked value and keeps the others', async () => {
    const wrapper = await mountGroup()

    await box(wrapper, 'Λευκό').trigger('click')

    expect(pf.updateFilters).toHaveBeenCalledExactlyOnceWith({ attributeValues: ['20', '7', '21'] })
  })

  it('takes an unticked value out and keeps the others', async () => {
    const wrapper = await mountGroup()

    await box(wrapper, 'Μαύρο').trigger('click')

    expect(pf.updateFilters).toHaveBeenCalledExactlyOnceWith({ attributeValues: ['7'] })
  })
})
