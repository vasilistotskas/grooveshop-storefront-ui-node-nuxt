import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import { useProductFilters } from '~/composables/useProductFilters'
import type { ProductFilters } from '~~/shared/types/product-filters'

/**
 * The wiring of `useProductFilters`: route query in, `router.push` out,
 * labels through the app's i18n. The parse / update / count / chip rules
 * themselves are table-tested in `test/unit/app/utils/productFilters.spec.ts`.
 */

const mockRoute = ref({ query: {} as Record<string, any> })

const mockRouter = {
  // Navigating updates the route the composable holds, as the real router does.
  push: vi.fn(async (to: any) => {
    mockRoute.value.query = { ...to.query }
  }),
  replace: vi.fn(),
  go: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  afterEach: vi.fn(() => vi.fn()),
  beforeEach: vi.fn(() => vi.fn()),
  // Methods required during Nuxt app initialisation — without these,
  // plugins like @nuxtjs/i18n fail to install, leaving $i18n undefined.
  beforeResolve: vi.fn(() => vi.fn()),
  onError: vi.fn(() => vi.fn()),
  isReady: vi.fn(() => Promise.resolve()),
  resolve: vi.fn(() => ({ path: '/', fullPath: '/', name: '', params: {}, query: {}, hash: '', matched: [], meta: {}, redirectedFrom: undefined, href: '/' })),
  hasRoute: vi.fn(() => false),
  getRoutes: vi.fn(() => []),
  addRoute: vi.fn(),
  removeRoute: vi.fn(),
  currentRoute: mockRoute,
  options: { history: { state: {} } },
}

// $i18n is the app's real @nuxtjs/i18n instance, so labels are real Greek.
mockNuxtImport('useRoute', () => () => mockRoute.value)
mockNuxtImport('useRouter', () => () => mockRouter)

describe('useProductFilters', () => {
  beforeEach(() => {
    mockRoute.value = { query: {} }
  })

  it('reports the brand and availability filters to the redesigned listing alone', () => {
    mockRoute.value.query = { brand: '3', inStock: 'true' }

    const { hasActiveFilters, hasActiveListingFilters, activeFilterChips, activeListingChips } = useProductFilters()

    expect(hasActiveListingFilters.value).toBe(true)
    expect(activeListingChips.value.map(chip => chip.type)).toEqual(['brand', 'in_stock'])
    expect(hasActiveFilters.value).toBe(false)
    expect(activeFilterChips.value).toEqual([])
  })

  it('derives the filters, count and chips from the route query', () => {
    mockRoute.value.query = { q: 'laptop', priceMin: '100', category: ['1', '2'] }
    const { filters, activeFilterCount, hasActiveFilters, activeFilterChips, filterCountBySection } = useProductFilters()
    const { $i18n } = useNuxtApp()

    expect(filters.value).toMatchObject({ search: 'laptop', priceMin: 100, categories: ['1', '2'] })
    expect(activeFilterCount.value).toBe(3)
    expect(hasActiveFilters.value).toBe(true)
    expect(filterCountBySection.value).toMatchObject({ search: 1, price: 1, categories: 2 })
    expect(activeFilterChips.value.map(chip => chip.label)).toEqual([
      $i18n.t('filters.search'),
      $i18n.t('filters.price'),
      $i18n.t('filters.categories'),
      $i18n.t('filters.categories'),
    ])
  })

  it('pushes the updated query, keeping the parameters it does not touch', async () => {
    mockRoute.value.query = { q: 'laptop', sort: 'name' }
    const { updateFilters, filters, hasActiveFilters } = useProductFilters()

    await updateFilters({ priceMin: 100, search: '' })

    expect(mockRouter.push).toHaveBeenCalledExactlyOnceWith({ query: { sort: 'name', priceMin: '100' } })
    expect(mockRouter.replace).not.toHaveBeenCalled()
    expect(filters.value).toMatchObject({ search: '', priceMin: 100, sort: 'name' })
    expect(hasActiveFilters.value).toBe(true)
  })

  it('clearFilters pushes an empty query', async () => {
    mockRoute.value.query = { q: 'laptop', priceMin: '100', page: '2' }
    const { clearFilters, hasActiveFilters } = useProductFilters()

    await clearFilters()

    expect(mockRouter.push).toHaveBeenCalledExactlyOnceWith({ query: {} })
    expect(hasActiveFilters.value).toBe(false)
  })

  it.each<[keyof ProductFilters, string]>([
    ['search', 'q'],
    ['priceMin', 'priceMin'],
    ['priceMax', 'priceMax'],
    ['likesMin', 'likesMin'],
    ['viewsMin', 'viewsMin'],
    ['categories', 'category'],
    ['sort', 'sort'],
    ['attributeValues', 'attributeValue'],
  ])('removeFilter(%s) drops only ?%s', async (key, param) => {
    const full: Record<string, any> = {
      q: 'laptop',
      priceMin: '100',
      priceMax: '500',
      likesMin: '50',
      viewsMin: '100',
      category: ['1', '2'],
      sort: '-finalPrice',
      attributeValue: ['10', '20'],
    }
    mockRoute.value.query = { ...full }
    const { removeFilter } = useProductFilters()

    await removeFilter(key)

    const { [param]: _removed, ...expected } = full
    expect(mockRouter.push).toHaveBeenCalledExactlyOnceWith({ query: expected })
  })
})
