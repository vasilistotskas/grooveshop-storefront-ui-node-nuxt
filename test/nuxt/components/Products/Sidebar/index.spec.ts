import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import Sidebar from '~/components/Products/Sidebar/index.vue'
import type { Brand, PaginatedAttributeList, PaginatedAttributeValueList } from '~~/shared/openapi/types.gen'
import { makeAttribute, makeAttributeValue, makeBrand, makeCategory } from '~~/test/fixtures/productFilters'
import { translatorFor } from '~/utils/translate'
import { buildCategoryForest } from '~/utils/categoryTree'
import { FILTER_SEARCH_MIN_SECTIONS } from '~/utils/filterSearch'

/**
 * The filter column: a section for the categories, one for the price,
 * one per attribute with something to choose — the column a wide screen
 * shows and the drawer a narrow one opens. The drawer's footer clears
 * the filters (keeping the sort) and closes on the results, saying how
 * many there are. Many sections earn a quick search on top; every column
 * has one button that opens or folds all of them.
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
  ProductsFiltersAttributeValues: { props: ['group'], template: '<div data-test="values" :data-options="group.options.map(o => o.label).join()">{{ group.label }}</div>' },
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
    tree.forest.value = buildCategoryForest([makeCategory({ id: 2 })], translatorFor('el'), { 2: 5 })
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

  describe('the quick search', () => {
    /** Colour (Red, Blue) and `count - 1` more attributes of one value each. */
    function showAttributes(count: number) {
      const names = [['Χρώμα', 'Κόκκινο'], ['Ισχύς', '65W'], ['Υλικό', 'Νάιλον'], ['Μήκος', '2m'], ['Βύσμα', 'USB-C'], ['Ύψος', '10cm']].slice(0, count)
      data.allAttributes.value = page(names.map(([name], index) => makeAttribute({ id: index + 1, name: { el: name!, en: name! } })))
      data.allAttributeValues.value = page([
        ...names.map(([, value], index) => makeAttributeValue({ id: 10 + index, attribute: index + 1, value: { el: value!, en: value! } })),
        makeAttributeValue({ id: 99, attribute: 1, value: { el: 'Μπλε', en: 'Blue' } }),
      ])
      data.attributeValueFacets.value = Object.fromEntries([...names.map((_, index) => [10 + index, 3]), [99, 2]])
    }

    const searchInput = (wrapper: VueWrapper) => wrapper.find('aside input')
    const search = async (wrapper: VueWrapper, text: string) => {
      await searchInput(wrapper).setValue(text)
    }
    const optionsOf = (wrapper: VueWrapper, label: string) =>
      wrapper.find('aside').findAll('[data-test="values"]').find(values => values.text() === label)?.attributes('data-options')

    it('is offered from the threshold up, not below it', async () => {
      // category, price, the attributes and availability: 7 below, 8 at it.
      showAttributes(FILTER_SEARCH_MIN_SECTIONS - 4)
      expect(searchInput(await mountSidebar()).exists()).toBe(false)

      showAttributes(FILTER_SEARCH_MIN_SECTIONS - 3)
      expect(searchInput(await mountSidebar()).exists()).toBe(true)
    })

    it('keeps a section whose own label matches, whole, ignoring case and accents', async () => {
      showAttributes(6)
      const wrapper = await mountSidebar()

      await search(wrapper, 'ΧΡΩΜΑ')

      expect(sections(wrapper)).toEqual(['Χρώμα'])
      expect(optionsOf(wrapper, 'Χρώμα')).toBe('Κόκκινο,Μπλε')
    })

    it('matches an availability section by its label only', async () => {
      showAttributes(6)
      const wrapper = await mountSidebar()

      await search(wrapper, 'διαθεσ')

      expect(sections(wrapper)).toEqual([own(wrapper, 'availability')])
    })

    it('keeps a section with a matching option, showing that option and any selected one', async () => {
      showAttributes(6)
      pf.filters.value = { ...pf.filters.value, attributeValues: ['99'] }
      const wrapper = await mountSidebar()

      await search(wrapper, 'κοκκ')

      expect(sections(wrapper)).toEqual(['Χρώμα'])
      expect(optionsOf(wrapper, 'Χρώμα')).toBe('Κόκκινο,Μπλε')
    })

    it('narrows a brand section to its matching options', async () => {
      showAttributes(6)
      brands.allBrands.value = [makeBrand({ id: 3, name: 'Kabelo' }), makeBrand({ id: 7, name: 'Voltra' })]
      brands.brandFacets.value = { 3: 10, 7: 14 }
      const wrapper = await mountSidebar()

      await search(wrapper, 'VOLT')

      expect(sections(wrapper)).toEqual([own(wrapper, 'brand')])
      expect(wrapper.get('[data-test="brands"]').text()).toBe('Voltra')
    })

    it('does not keep a section for a selected option the query does not name', async () => {
      showAttributes(6)
      pf.filters.value = { ...pf.filters.value, attributeValues: ['99'] }
      const wrapper = await mountSidebar()

      await search(wrapper, '65w')

      expect(sections(wrapper)).toEqual(['Ισχύς'])
    })

    it('opens every section it leaves, however the shopper folded them', async () => {
      showAttributes(6)
      const wrapper = await mountSidebar()
      await wrapper.get('aside button[aria-expanded="true"]').trigger('click')
      expect(wrapper.find('aside').findAll('button[aria-expanded="false"]')).toHaveLength(1)

      await search(wrapper, 'α')

      expect(wrapper.find('aside').findAll('button[aria-expanded="false"]')).toHaveLength(0)
    })

    it('says so when nothing matches, and clears from the input\'s own button', async () => {
      showAttributes(6)
      const wrapper = await mountSidebar()

      await search(wrapper, 'zzz')

      expect(sections(wrapper)).toEqual([])
      expect(wrapper.get('aside [role="status"]').text()).toBe(own(wrapper, 'no_match', { query: 'zzz' }))

      await wrapper.get(`aside button[aria-label="${own(wrapper, 'search_clear')}"]`).trigger('click')

      expect((searchInput(wrapper).element as HTMLInputElement).value).toBe('')
      expect(wrapper.find('aside [role="status"]').exists()).toBe(false)
      expect(sections(wrapper)).toHaveLength(9)
    })
  })

  describe('expand / collapse all', () => {
    const toggle = (wrapper: VueWrapper) =>
      wrapper.get(`aside button[aria-label="${own(wrapper, 'collapse_all_label')}"], aside button[aria-label="${own(wrapper, 'expand_all_label')}"]`)

    it('folds every section, then opens them again, its label saying which it will do', async () => {
      const wrapper = await mountSidebar()
      expect(toggle(wrapper).attributes('aria-label')).toBe(own(wrapper, 'collapse_all_label'))
      expect(toggle(wrapper).text()).toBe(own(wrapper, 'collapse_all'))

      await toggle(wrapper).trigger('click')

      expect(wrapper.find('aside').findAll('button[aria-expanded="true"]')).toHaveLength(0)
      expect(toggle(wrapper).attributes('aria-label')).toBe(own(wrapper, 'expand_all_label'))
      expect(toggle(wrapper).text()).toBe(own(wrapper, 'expand_all'))

      await toggle(wrapper).trigger('click')

      expect(wrapper.find('aside').findAll('button[aria-expanded="true"]')).toHaveLength(5)
    })

    it('offers to expand once one section is folded, and opens them all', async () => {
      const wrapper = await mountSidebar()
      await wrapper.get('aside button[aria-expanded="true"]').trigger('click')

      expect(toggle(wrapper).text()).toBe(own(wrapper, 'expand_all'))
      await toggle(wrapper).trigger('click')

      expect(wrapper.find('aside').findAll('button[aria-expanded="true"]')).toHaveLength(5)
    })
  })

  // The classes are the contract here: happy-dom has no layout to measure.
  it('is a sticky column with its own scroll on a wide screen', async () => {
    const wrapper = await mountSidebar()

    const classes = wrapper.get('aside').classes()
    expect(classes).toContain('lg:sticky')
    expect(classes).toContain('lg:top-[calc(var(--ui-header-height)+1.5rem)]')
    expect(classes).toContain('lg:max-h-[calc(100dvh-var(--ui-header-height)-3rem)]')
    expect(classes).toContain('lg:overflow-y-auto')
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
