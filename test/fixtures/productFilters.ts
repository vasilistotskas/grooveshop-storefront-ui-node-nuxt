import { vi } from 'vitest'
import { computed, ref } from 'vue'
import type {
  Attribute,
  AttributeValue,
  BlogPostMeiliSearchResponse,
  BlogPostMeiliSearchResult,
  Brand,
  ProductCategory,
  ProductMeiliSearchResponse,
  ProductMeiliSearchResult,
} from '~~/shared/openapi/types.gen'
import type { FilterChip, ListingFilterChip, ProductFilters } from '~~/shared/types/product-filters'
import { FIXTURE_TIMESTAMP, fixtureUuid } from './product'

/**
 * The URL-derived filter state `useProductFilters().filters` holds with
 * no query string at all — every field present, as the composable
 * builds it (`app/composables/useProductFilters.ts`).
 */
export function makeProductFilters(overrides: Partial<ProductFilters> = {}): ProductFilters {
  return {
    search: '',
    priceMin: undefined,
    priceMax: undefined,
    likesMin: undefined,
    viewsMin: undefined,
    categories: [],
    sort: '',
    attributeValues: [],
    brands: [],
    inStock: false,
    onOffer: false,
    ...overrides,
  }
}

/**
 * A stand-in for `useProductFilters()` in a component spec: the state is
 * plain refs the spec sets, and the three actions are `vi.fn`s whose
 * calls ARE the component's output (the real ones write the URL).
 *
 * `activeFilterChips` and `activeFilterCount` are set by the spec, not
 * derived — deriving them would copy the composable's logic into the
 * test (it has its own spec). `hasActiveFilters` follows the count as
 * it does in the composable.
 *
 * Refs are module state the project's `mockReset` does not touch, so
 * call `reset()` in `beforeEach`. Share it into `mockNuxtImport` through
 * an async `vi.hoisted`:
 *
 * ```ts
 * const pf = await vi.hoisted(async () =>
 *   (await import('~~/test/fixtures/productFilters')).createProductFiltersMock())
 * mockNuxtImport('useProductFilters', () => () => pf)
 * beforeEach(() => pf.reset())
 * ```
 */
export function createProductFiltersMock() {
  const filters = ref<ProductFilters>(makeProductFilters())
  const activeFilterChips = ref<FilterChip[]>([])
  const activeListingChips = ref<ListingFilterChip[]>([])
  const activeFilterCount = ref(0)
  const hasActiveFilters = computed(() => activeFilterCount.value > 0)
  const hasActiveListingFilters = hasActiveFilters

  return {
    filters,
    activeFilterChips,
    activeListingChips,
    activeFilterCount,
    hasActiveFilters,
    hasActiveListingFilters,
    updateFilters: vi.fn((_updates: Partial<ProductFilters>) => Promise.resolve()),
    removeFilter: vi.fn((_key: keyof ProductFilters) => Promise.resolve()),
    clearFilters: vi.fn(() => Promise.resolve()),
    filterCountBySection: computed(() => ({
      search: filters.value.search ? 1 : 0,
      price: filters.value.priceMin !== undefined || filters.value.priceMax !== undefined ? 1 : 0,
      popularity: filters.value.likesMin !== undefined ? 1 : 0,
      viewCount: filters.value.viewsMin !== undefined ? 1 : 0,
      categories: filters.value.categories.length,
      attributes: filters.value.attributeValues.length,
    })),
    /** Back to no filters, no chips — call it in `beforeEach`. */
    reset() {
      filters.value = makeProductFilters()
      activeFilterChips.value = []
      activeListingChips.value = []
      activeFilterCount.value = 0
    },
  }
}

/**
 * A `ProductCategory` as `/api/products/categories/all` lists it, valid
 * against the generated `zProductCategory` (proved by
 * `test/unit/fixtures/productFilters.spec.ts`). Its name lives in parler
 * `translations` — a fixture with a top-level `name` renders nothing,
 * because every reader goes through `extractTranslated`.
 *
 * Defaults: id 1, named `Κατηγορία 1` / `Category 1`, a root node.
 * `name` sets both locales' names in one go.
 */
export function makeCategory(
  overrides: Partial<ProductCategory> & { name?: { el: string, en: string } } = {},
): ProductCategory {
  const { name, ...rest } = overrides
  const id = rest.id ?? 1
  return {
    id,
    translations: {
      el: { name: name?.el ?? `Κατηγορία ${id}`, description: '', seoTitle: '', seoDescription: '', seoKeywords: '' },
      en: { name: name?.en ?? `Category ${id}`, description: '', seoTitle: '', seoDescription: '', seoKeywords: '' },
    },
    slug: `category-${id}`,
    active: true,
    parent: null,
    level: 0,
    treeId: id,
    mainImagePath: '',
    recursiveProductCount: 0,
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    uuid: fixtureUuid(5, id),
    ...rest,
  }
}

/** A `Brand` as `/api/products/brands/all` lists it, valid against `zBrand`. */
export function makeBrand(overrides: Partial<Brand> = {}): Brand {
  const id = overrides.id ?? 1
  return { id, name: `Μάρκα ${id}`, ...overrides }
}

/** An `Attribute` (e.g. Colour), valid against `zAttribute`. `name` sets both locales. */
export function makeAttribute(
  overrides: Partial<Attribute> & { name?: { el: string, en: string } } = {},
): Attribute {
  const { name, ...rest } = overrides
  const id = rest.id ?? 1
  return {
    id,
    uuid: fixtureUuid(6, id),
    translations: {
      el: { name: name?.el ?? `Χαρακτηριστικό ${id}` },
      en: { name: name?.en ?? `Attribute ${id}` },
    },
    active: true,
    sortOrder: id,
    valuesCount: 0,
    usageCount: 0,
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    ...rest,
  }
}

/**
 * An `AttributeValue` (e.g. Red) of attribute `attribute`, valid against
 * `zAttributeValue`. `value` sets both locales.
 */
export function makeAttributeValue(
  overrides: Partial<AttributeValue> & { value?: { el: string, en: string } } = {},
): AttributeValue {
  const { value, ...rest } = overrides
  const id = rest.id ?? 1
  return {
    id,
    uuid: fixtureUuid(7, id),
    attribute: 1,
    attributeName: 'Attribute 1',
    translations: {
      el: { value: value?.el ?? `Τιμή ${id}` },
      en: { value: value?.en ?? `Value ${id}` },
    },
    active: true,
    sortOrder: id,
    usageCount: 0,
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    ...rest,
  }
}

/** One product hit of `/api/products/search`, valid against `zProductMeiliSearchResult`. */
export function makeProductSearchHit(overrides: Partial<ProductMeiliSearchResult> = {}): ProductMeiliSearchResult {
  const id = overrides.id ?? 1
  return {
    id,
    languageCode: 'el',
    name: `Προϊόν ${id}`,
    description: '',
    master: id,
    slug: `product-${id}`,
    mainImagePath: '',
    matchesPosition: null,
    rankingScore: null,
    formatted: null,
    contentType: 'product',
    finalPrice: 62,
    price: 50,
    discountPercent: 0,
    offerKind: null,
    stock: 10,
    likesCount: 0,
    viewCount: 0,
    reviewAverage: null,
    vatPercent: 24,
    categoryName: null,
    brandName: null,
    reviewCount: 0,
    createdAt: null,
    lowStockThreshold: null,
    ...overrides,
  }
}

/**
 * The `/api/products/search` payload, valid against
 * `zProductMeiliSearchResponse`. `estimatedTotalHits` follows `results`
 * unless given; `queryId` is fixed so a click can be traced to it.
 */
export function makeProductSearchResponse(
  overrides: Partial<ProductMeiliSearchResponse> = {},
): ProductMeiliSearchResponse {
  const results = overrides.results ?? []
  return {
    queryId: fixtureUuid(8, 1),
    relaxedQuery: null,
    limit: 12,
    offset: 0,
    estimatedTotalHits: results.length,
    results,
    ...overrides,
  }
}

/** One blog-post hit of `/api/search`, valid against `zBlogPostMeiliSearchResult`. */
export function makeBlogPostSearchHit(overrides: Partial<BlogPostMeiliSearchResult> = {}): BlogPostMeiliSearchResult {
  const id = overrides.id ?? 1
  return {
    id,
    languageCode: 'el',
    title: `Άρθρο ${id}`,
    subtitle: '',
    body: '',
    master: id,
    slug: `post-${id}`,
    mainImagePath: '',
    matchesPosition: null,
    rankingScore: null,
    formatted: null,
    contentType: 'blog_post',
    ...overrides,
  }
}

/** The blog half of `/api/search`, valid against `zBlogPostMeiliSearchResponse`. */
export function makeBlogPostSearchResponse(
  overrides: Partial<BlogPostMeiliSearchResponse> = {},
): BlogPostMeiliSearchResponse {
  const results = overrides.results ?? []
  return {
    queryId: fixtureUuid(8, 2),
    relaxedQuery: null,
    limit: 3,
    offset: 0,
    estimatedTotalHits: results.length,
    results,
    ...overrides,
  }
}
