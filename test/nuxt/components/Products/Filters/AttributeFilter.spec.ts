import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import AttributeFilter from '~/components/Products/Filters/AttributeFilter.vue'
import WebsideAttributeFilter from '~/components/variants/webside/Products/Filters/AttributeFilter.vue'
import type { PaginatedAttributeList, PaginatedAttributeValueList } from '~~/shared/openapi/types.gen'
import { makeAttribute, makeAttributeValue } from '~~/test/fixtures/productFilters'
import { trees } from '~~/test/helpers/trees'

/**
 * Attribute values are grouped under their attribute, one accordion
 * section each. Like the category list, a value with no products under
 * the other filters is shown but cannot be picked, and a picked one can
 * always be un-picked; an inactive value is not offered at all.
 */
const pf = await vi.hoisted(async () =>
  (await import('~~/test/fixtures/productFilters')).createProductFiltersMock())
mockNuxtImport('useProductFilters', () => () => pf)

type Status = 'idle' | 'pending' | 'success' | 'error'
const data = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return {
    allAttributes: ref<PaginatedAttributeList | undefined>(undefined),
    attributesStatus: ref<Status>('success'),
    allAttributeValues: ref<PaginatedAttributeValueList | undefined>(undefined),
    attributeValuesStatus: ref<Status>('success'),
    attributeValueFacets: ref<Record<string, number>>({}),
  }
})
mockNuxtImport('useProductSearchData', () => () => data)

const COLOUR = makeAttribute({ id: 1, name: { el: 'Χρώμα', en: 'Colour' } })
const SIZE = makeAttribute({ id: 2, name: { el: 'Μέγεθος', en: 'Size' } })
const EMPTY = makeAttribute({ id: 3, name: { el: 'Υλικό', en: 'Material' } })
const VALUES = [
  makeAttributeValue({ id: 10, attribute: 1, sortOrder: 2, value: { el: 'Κόκκινο', en: 'Red' } }),
  makeAttributeValue({ id: 11, attribute: 1, sortOrder: 1, value: { el: 'Μπλε', en: 'Blue' } }),
  makeAttributeValue({ id: 12, attribute: 1, sortOrder: 3, value: { el: 'Πράσινο', en: 'Green' } }),
  makeAttributeValue({ id: 13, attribute: 1, active: false, value: { el: 'Μωβ', en: 'Purple' } }),
  makeAttributeValue({ id: 20, attribute: 2, value: { el: 'Μεσαίο', en: 'Medium' } }),
]

const list = <T>(results: T[]) => ({ count: results.length, results })

const own = (wrapper: VueWrapper, key: string): string =>
  (wrapper.vm as unknown as { t: (k: string) => string }).t(key)

/** Open an attribute's accordion section by its name. */
async function open(wrapper: VueWrapper, name: string) {
  const trigger = wrapper.findAll('button').find(b => b.text() === name)
  expect(trigger, `no accordion section named ${name}`).toBeDefined()
  await trigger!.trigger('click')
}

/** A value button's name: its accessible name reads `<value> - <count> <products>`. */
const nameOf = (b: ReturnType<VueWrapper['find']>) => b.attributes('aria-label')!.split(' - ')[0]
const valueButtons = (wrapper: VueWrapper) => wrapper.findAll('button[aria-pressed]')
const listedValues = (wrapper: VueWrapper) => valueButtons(wrapper).map(nameOf)
const valueButton = (wrapper: VueWrapper, name: string) => {
  const found = valueButtons(wrapper).find(b => nameOf(b) === name)
  expect(found, `no value button named ${name}`).toBeDefined()
  return found!
}

describe.each(trees(AttributeFilter, WebsideAttributeFilter))('$tree Products/Filters/AttributeFilter', ({ C }) => {
  beforeEach(() => {
    pf.reset()
    data.allAttributes.value = list([COLOUR, SIZE, EMPTY])
    data.allAttributeValues.value = list(VALUES)
    data.attributesStatus.value = 'success'
    data.attributeValuesStatus.value = 'success'
    data.attributeValueFacets.value = { 10: 4, 11: 4, 12: 9, 13: 5, 20: 0 }
  })

  it('offers one section per attribute that has values, by its name in the page locale', async () => {
    const wrapper = await mountSuspended(C, { route: false })

    // Every section starts closed, so the only buttons are the section headers.
    expect(wrapper.findAll('button').map(b => b.text())).toEqual(['Χρώμα', 'Μέγεθος'])
  })

  it('lists the active values, most stocked first, then by their sort order', async () => {
    const wrapper = await mountSuspended(C, { route: false })

    await open(wrapper, 'Χρώμα')

    // 10 and 11 tie on 4 products; 11 sorts first. 13 is inactive.
    expect(listedValues(wrapper)).toEqual(['Πράσινο', 'Μπλε', 'Κόκκινο'])
  })

  it('lists the picked values first', async () => {
    pf.filters.value.attributeValues = ['10']
    const wrapper = await mountSuspended(C, { route: false })

    await open(wrapper, 'Χρώμα')

    expect(listedValues(wrapper)).toEqual(['Κόκκινο', 'Πράσινο', 'Μπλε'])
    expect(valueButton(wrapper, 'Κόκκινο').attributes('aria-pressed')).toBe('true')
  })

  it('adds a value to the selection and takes a picked one out', async () => {
    pf.filters.value.attributeValues = ['10']
    const wrapper = await mountSuspended(C, { route: false })
    await open(wrapper, 'Χρώμα')

    await valueButton(wrapper, 'Μπλε').trigger('click')
    await valueButton(wrapper, 'Κόκκινο').trigger('click')

    expect(pf.updateFilters.mock.calls).toEqual([
      [{ attributeValues: ['10', '11'] }],
      [{ attributeValues: [] }],
    ])
  })

  it('shows a value with no matching products but will not pick it', async () => {
    const wrapper = await mountSuspended(C, { route: false })
    await open(wrapper, 'Μέγεθος')

    const medium = valueButton(wrapper, 'Μεσαίο')
    expect(medium.attributes('disabled')).toBeDefined()
    await medium.trigger('click')

    expect(pf.updateFilters).not.toHaveBeenCalled()
  })

  it.each([
    ['the attributes', 'attributesStatus'],
    ['their values', 'attributeValuesStatus'],
  ] as const)('shows skeletons while %s load', async (_case, status) => {
    data[status].value = 'pending'

    const wrapper = await mountSuspended(C, { route: false })

    expect(wrapper.findAllComponents({ name: 'USkeleton' })).toHaveLength(3)
    expect(wrapper.findComponent({ name: 'UAccordion' }).exists()).toBe(false)
  })

  it('shows the empty state when no attribute has an active value', async () => {
    data.allAttributeValues.value = list([VALUES[3]!])

    const wrapper = await mountSuspended(C, { route: false })

    expect(wrapper.findComponent({ name: 'UAccordion' }).exists()).toBe(false)
    expect(wrapper.text()).toBe(own(wrapper, 'no_attributes'))
  })
})
