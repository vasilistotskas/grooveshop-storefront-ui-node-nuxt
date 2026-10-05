import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import Sidebar from '~/components/Products/Sidebar/index.vue'
import type { Brand, PaginatedAttributeList, PaginatedAttributeValueList } from '~~/shared/openapi/types.gen'
import { makeAttribute, makeAttributeValue, makeBrand, makeCategory } from '~~/test/fixtures/productFilters'
import { buildCategoryForest } from '~/utils/categoryTree'

/**
 * The filter column: a section for the categories, one for the price,
 * one per attribute with something to choose — the column a wide screen
 * shows and the drawer a narrow one opens. The drawer's footer clears
 * the filters (keeping the sort) and closes on the results, saying how
 * many there are.
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
    priceStats: ref({ min: 5, max: 120 }),
    isPriceStatsLoaded: ref(true),
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

const tree = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return { forest: ref<import('~/utils/categoryTree').CategoryNode[]>([]), trail: ref([]) }
})
mockNuxtImport('useCategoryForest', () => () => tree)

const page = <T>(results: T[]) => ({ links: { next: null, previous: null }, count: results.length, totalPages: 1, pageSize: 100, pageTotalResults: results.length, page: 1, results })

const STUBS = {
  ProductsFiltersCategoryTree: { template: '<div data-test="tree" />' },
  ProductsFiltersPriceRange: { template: '<div data-test="price" />' },
  ProductsFiltersBrandValues: { props: ['options'], template: '<div data-test="brands">{{ options.map(o => o.label).join() }}</div>' },
  ProductsFiltersAvailability: { template: '<div data-test="availability" />' },
  ProductsFiltersAttributeValues: { props: ['group'], template: '<div data-test="values">{{ group.label }}</div>' },
}

const own = (wrapper: VueWrapper, key: string, ...args: unknown[]) =>
  (wrapper.vm as unknown as { t: (k: string, ...a: unknown[]) => string }).t(key, ...args)

/** The column's section headings, in order. */
const sections = (wrapper: VueWrapper) =>
  wrapper.find('aside').findAll('button[aria-expanded]').map(button => button.text())

const mountSidebar = (totalResults = 28) =>
  mountSuspended(Sidebar, { route: false, props: { totalResults }, global: { stubs: STUBS } })

describe('Products/Sidebar', () => {
  beforeEach(() => {
    pf.reset()
    tree.forest.value = buildCategoryForest([makeCategory({ id: 2 })], 'el', { 2: 5 })
    data.priceStats.value = { min: 5, max: 120 }
    data.isPriceStatsLoaded.value = true
    data.allAttributes.value = page([
      makeAttribute({ id: 1, name: { el: 'Ισχύς', en: 'Power' } }),
      makeAttribute({ id: 2, name: { el: 'Χρώμα', en: 'Colour' } }),
    ])
    data.allAttributeValues.value = page([
      makeAttributeValue({ id: 10, attribute: 1 }),
      makeAttributeValue({ id: 20, attribute: 2 }),
    ])
    data.attributeValueFacets.value = { 10: 3, 20: 4 }
    brands.allBrands.value = undefined
    brands.brandFacets.value = {}
  })

  it('puts the brands after the price, listing only brands the listing carries', async () => {
    brands.allBrands.value = [makeBrand({ id: 3, name: 'Kabelo' }), makeBrand({ id: 7, name: 'Voltra' }), makeBrand({ id: 9, name: 'Groove' })]
    brands.brandFacets.value = { 3: 10, 7: 14 }

    const wrapper = await mountSidebar()

    expect(sections(wrapper).slice(0, 3)).toEqual([own(wrapper, 'category'), own(wrapper, 'price'), own(wrapper, 'brand')])
    expect(wrapper.get('[data-test="brands"]').text()).toBe('Kabelo,Voltra')
  })

  it('leaves out the brands until the brand list is here, even with one selected', async () => {
    pf.filters.value = { ...pf.filters.value, brands: ['3'] }
    brands.brandFacets.value = { 3: 10 }

    const wrapper = await mountSidebar()

    expect(sections(wrapper)).not.toContain(own(wrapper, 'brand'))
  })

  it('leaves out the brands when none is counted', async () => {
    brands.allBrands.value = [makeBrand({ id: 3 })]

    const wrapper = await mountSidebar()

    expect(sections(wrapper)).not.toContain(own(wrapper, 'brand'))
  })

  it('opens with the categories, the price, then one section per attribute', async () => {
    const wrapper = await mountSidebar()

    expect(sections(wrapper)).toEqual([own(wrapper, 'category'), own(wrapper, 'price'), 'Ισχύς', 'Χρώμα', own(wrapper, 'availability')])
    expect(wrapper.find('aside').findAll('button[aria-expanded="true"]')).toHaveLength(5)
    expect(wrapper.find('aside').findAll('[data-test="values"]').map(values => values.text())).toEqual(['Ισχύς', 'Χρώμα'])
  })

  it('leaves out a section with nothing to choose', async () => {
    tree.forest.value = []
    data.priceStats.value = { min: 9, max: 9 }
    data.attributeValueFacets.value = { 20: 4 }

    const wrapper = await mountSidebar()

    expect(sections(wrapper)).toEqual(['Χρώμα', own(wrapper, 'availability')])
  })

  describe('the drawer', () => {
    async function openDrawer(wrapper: VueWrapper) {
      (wrapper.vm as unknown as { toggleDrawer: () => void }).toggleDrawer()
      await flushPromises()
      const dialog = document.body.querySelector('[role="dialog"]')
      expect(dialog, 'the drawer did not open').not.toBeNull()
      return dialog!
    }

    const footerButton = (dialog: Element, label: string) =>
      [...dialog.querySelectorAll('button')].find(button => button.textContent?.trim() === label)

    it('says how many products the filters leave, and closes on them', async () => {
      const wrapper = await mountSidebar(6)
      const dialog = await openDrawer(wrapper)

      const show = footerButton(dialog, own(wrapper, 'show_results', 6, { named: { count: 6 } }))
      expect(show).toBeDefined()
      show!.click()
      await flushPromises()

      // The element lingers for vaul's closing animation; the state is what closed.
      expect(wrapper.findComponent({ name: 'UDrawer' }).props('open')).toBe(false)
    })

    it('clears the filters and keeps the sort, and has nothing to clear without filters', async () => {
      const wrapper = await mountSidebar()
      let dialog = await openDrawer(wrapper)
      expect(footerButton(dialog, own(wrapper, 'clear'))!.disabled).toBe(true)
      wrapper.unmount()

      pf.activeListingChips.value = [{ key: 'attributeValues', type: 'attribute', label: 'a', value: '10' }]
      const filtered = await mountSidebar()
      dialog = await openDrawer(filtered)
      footerButton(dialog, own(filtered, 'clear'))!.click()

      expect(pf.updateFilters).toHaveBeenCalledExactlyOnceWith(CLEARED_FILTERS)
    })
  })
})
