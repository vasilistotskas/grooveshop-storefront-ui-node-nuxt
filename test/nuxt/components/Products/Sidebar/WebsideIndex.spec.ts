import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import Sidebar from '~/components/variants/webside/Products/Sidebar/index.vue'
import type { Brand, PaginatedAttributeList, PaginatedAttributeValueList } from '~~/shared/openapi/types.gen'
import { makeAttribute, makeAttributeValue, makeBrand } from '~~/test/fixtures/productFilters'
import { FILTER_SEARCH_MIN_SECTIONS } from '~/utils/filterSearch'

/**
 * Webside's filter column: the brand section exists only while the
 * listing carries a brand, the availability switches always; many
 * sections earn the quick search, and one button opens or folds all.
 */
const pf = await vi.hoisted(async () =>
  (await import('~~/test/fixtures/productFilters')).createProductFiltersMock())
mockNuxtImport('useProductFilters', () => () => pf)

const data = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return {
    allAttributes: ref<PaginatedAttributeList | undefined>(undefined),
    allAttributeValues: ref<PaginatedAttributeValueList | undefined>(undefined),
    attributeValueFacets: ref<Record<string, number>>({}),
  }
})
mockNuxtImport('useProductSearchData', () => () => data)

const brands = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return {
    allBrands: ref<Brand[] | undefined>(undefined),
    brandFacets: ref<Record<string, number>>({}),
  }
})
mockNuxtImport('useProductBrands', () => () => brands)

const page = <T>(results: T[]) => ({ links: { next: null, previous: null }, count: results.length, totalPages: 1, pageSize: 100, pageTotalResults: results.length, page: 1, results })

const STUBS = {
  WebsideProductsFiltersPriceRange: { template: '<div />' },
  WebsideProductsFiltersPopularityFilter: { template: '<div />' },
  WebsideProductsFiltersViewCountFilter: { template: '<div />' },
  WebsideProductsFiltersCategoryFilter: { template: '<div />' },
  WebsideProductsFiltersActiveFilters: { template: '<div />' },
  WebsideProductsFiltersBrandFilter: { props: ['options'], template: '<div data-test="brands">{{ options.map(o => o.label).join() }}</div>' },
  WebsideProductsFiltersAttributeFilter: { props: ['query'], template: '<div data-test="attributes" :data-query="query" />' },
  WebsideProductsFiltersAvailabilityFilter: { template: '<div data-test="availability" />' },
}

const own = (wrapper: VueWrapper, key: string, ...args: unknown[]) =>
  (wrapper.vm as unknown as { t: (k: string, ...a: unknown[]) => string }).t(key, ...args)

/** The section headings, in order. */
const sections = (wrapper: VueWrapper) =>
  wrapper.find('[role="region"]').findAll('button[aria-expanded]')
    .filter(button => button.attributes('aria-label') === undefined)
    .map(button => button.text())

const mountSidebar = () => mountSuspended(Sidebar, { route: false, global: { stubs: STUBS } })

/** `count` attributes of one value each. */
function showAttributes(count: number) {
  const names = ['Χρώμα', 'Ισχύς', 'Υλικό', 'Μήκος', 'Βύσμα', 'Ύψος'].slice(0, count)
  data.allAttributes.value = page(names.map((name, index) => makeAttribute({ id: index + 1, name: { el: name, en: name } })))
  data.allAttributeValues.value = page(names.map((name, index) => makeAttributeValue({ id: 10 + index, attribute: index + 1, value: { el: `${name}-τιμή`, en: `${name}-value` } })))
  data.attributeValueFacets.value = Object.fromEntries(names.map((_, index) => [10 + index, 3]))
}

describe('webside Products/Sidebar', () => {
  beforeEach(() => {
    pf.reset()
    data.allAttributes.value = undefined
    data.allAttributeValues.value = undefined
    data.attributeValueFacets.value = {}
    brands.allBrands.value = undefined
    brands.brandFacets.value = {}
  })

  it('has no brand section until the listing carries a brand, and always the availability one', async () => {
    const wrapper = await mountSidebar()

    expect(sections(wrapper)).not.toContain(own(wrapper, 'filters.brands'))
    expect(sections(wrapper).at(-1)).toBe(own(wrapper, 'filters.availability'))
  })

  it('puts the brands after the categories, listing only brands the listing carries', async () => {
    brands.allBrands.value = [makeBrand({ id: 3, name: 'Kabelo' }), makeBrand({ id: 7, name: 'Voltra' }), makeBrand({ id: 9, name: 'Groove' })]
    brands.brandFacets.value = { 3: 10, 7: 14 }

    const wrapper = await mountSidebar()
    await wrapper.get(`button[aria-label="${own(wrapper, 'filters.expand_all_label')}"]`).trigger('click')

    const headings = sections(wrapper)
    expect(headings.indexOf(own(wrapper, 'filters.brands'))).toBe(headings.indexOf(own(wrapper, 'filters.categories')) + 1)
    expect(wrapper.get('[data-test="brands"]').text()).toBe('Kabelo,Voltra')
  })

  it('shows how many brands and availability switches are on in their headings', async () => {
    brands.allBrands.value = [makeBrand({ id: 3, name: 'Kabelo' })]
    brands.brandFacets.value = { 3: 10 }
    pf.filters.value = { ...pf.filters.value, brands: ['3'], inStock: true, onOffer: true }

    const wrapper = await mountSidebar()

    expect(sections(wrapper)).toEqual(expect.arrayContaining([
      `${own(wrapper, 'filters.brands')} (1)`,
      `${own(wrapper, 'filters.availability')} (2)`,
    ]))
  })

  describe('the quick search', () => {
    const searchInput = (wrapper: VueWrapper) => wrapper.find('[role="region"] input[aria-label]')

    it('is offered from the threshold up, not below it', async () => {
      // price, popularity, views, categories and availability, then the attributes.
      showAttributes(FILTER_SEARCH_MIN_SECTIONS - 6)
      expect(searchInput(await mountSidebar()).exists()).toBe(false)

      showAttributes(FILTER_SEARCH_MIN_SECTIONS - 5)
      expect(searchInput(await mountSidebar()).exists()).toBe(true)
    })

    it('narrows the brand section to its matching options, ignoring case', async () => {
      showAttributes(FILTER_SEARCH_MIN_SECTIONS - 5)
      brands.allBrands.value = [makeBrand({ id: 3, name: 'Kabelo' }), makeBrand({ id: 7, name: 'Voltra' })]
      brands.brandFacets.value = { 3: 10, 7: 14 }
      const wrapper = await mountSidebar()

      await searchInput(wrapper).setValue('VOLT')

      expect(sections(wrapper)).toEqual([own(wrapper, 'filters.brands')])
      expect(wrapper.get('[data-test="brands"]').text()).toBe('Voltra')
    })

    it('hands the folded query to the attribute section when an attribute value matches', async () => {
      showAttributes(FILTER_SEARCH_MIN_SECTIONS - 5)
      const wrapper = await mountSidebar()

      await searchInput(wrapper).setValue('Υλικό-ΤΙΜΗ')

      expect(sections(wrapper)).toEqual([own(wrapper, 'filters.attributes')])
      expect(wrapper.get('[data-test="attributes"]').attributes('data-query')).toBe(foldText('Υλικό-ΤΙΜΗ'))
    })

    it('says so when nothing matches', async () => {
      showAttributes(FILTER_SEARCH_MIN_SECTIONS - 5)
      const wrapper = await mountSidebar()

      await searchInput(wrapper).setValue('zzz')

      expect(sections(wrapper)).toEqual([])
      expect(wrapper.get('[role="status"]').text()).toBe(own(wrapper, 'filters.no_match', { query: 'zzz' }))
    })
  })

  describe('expand / collapse all', () => {
    const toggle = (wrapper: VueWrapper) =>
      wrapper.get(`button[aria-label="${own(wrapper, 'filters.expand_all_label')}"], button[aria-label="${own(wrapper, 'filters.collapse_all_label')}"]`)
    const open = (wrapper: VueWrapper) =>
      wrapper.find('[role="region"]').findAll('button[aria-expanded="true"]').length

    it('opens every section, then folds them again, its label saying which it will do', async () => {
      const wrapper = await mountSidebar()
      expect(toggle(wrapper).attributes('aria-label')).toBe(own(wrapper, 'filters.expand_all_label'))
      const initiallyOpen = open(wrapper)

      await toggle(wrapper).trigger('click')

      expect(open(wrapper)).toBeGreaterThan(initiallyOpen)
      expect(toggle(wrapper).attributes('aria-label')).toBe(own(wrapper, 'filters.collapse_all_label'))

      await toggle(wrapper).trigger('click')

      expect(open(wrapper)).toBe(0)
    })
  })
})
