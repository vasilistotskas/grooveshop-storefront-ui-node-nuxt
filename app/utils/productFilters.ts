import type { LocationQuery } from 'vue-router'

/**
 * The pure half of `useProductFilters`: the product-listing filters are
 * stored in the URL query, and these functions translate between the
 * two. The composable wires them to the route, the router and `t()`.
 */

/** A query value that may be repeated (`?category=1&category=2`), as a list. */
function queryList(value: LocationQuery[string] | undefined): string[] {
  if (!value) return []
  return Array.isArray(value) ? (value as string[]) : [value]
}

/**
 * A numeric filter as the search API accepts it — its query schema
 * (`zApiV1SearchProductRetrieveQuery`): a plain decimal, or an integer.
 * Anything else (text, a repeated parameter, `Infinity`, an exponent)
 * is no filter, rather than a NaN the search would refuse with a 400.
 */
const DECIMAL = /^-?\d+(?:\.\d+)?$/
const INTEGER = /^-?\d+$/
function queryNumber(value: LocationQuery[string] | undefined, pattern: RegExp): number | undefined {
  return typeof value === 'string' && pattern.test(value) ? Number(value) : undefined
}

/** A list filter as the URL stores it: one value bare, several as an array. */
function listQueryValue(values: string[]): string | string[] {
  return values.length === 1 ? values[0]! : values
}

/** A flag filter as the URL stores it: `?inStock=true`; anything else is off. */
function queryFlag(value: LocationQuery[string] | undefined): boolean {
  return value === 'true'
}

/** The filter state a listing URL's query describes. */
export function parseProductFilters(query: LocationQuery): ProductFilters {
  return {
    search: (query.q as string) || '',
    priceMin: queryNumber(query.priceMin, DECIMAL),
    priceMax: queryNumber(query.priceMax, DECIMAL),
    likesMin: queryNumber(query.likesMin, INTEGER),
    viewsMin: queryNumber(query.viewsMin, INTEGER),
    categories: queryList(query.category),
    sort: (query.sort as string) || '',
    attributeValues: queryList(query.attributeValue),
    brands: queryList(query.brand),
    inStock: queryFlag(query.inStock),
    onOffer: queryFlag(query.onOffer),
  }
}

/**
 * The query after applying `updates` to `query`; parameters the updates
 * do not mention are kept. A string or list filter set to `''` / `[]`
 * is removed, as is a numeric filter present in `updates` with
 * `undefined` or `null` — a numeric key is only touched when present,
 * so `{ priceMin: undefined }` removes it while `{}` leaves it alone.
 */
export function applyFilterUpdates(
  query: LocationQuery,
  updates: Partial<ProductFilters>,
): Record<string, any> {
  const next: Record<string, any> = { ...query }

  if (updates.search !== undefined) {
    if (updates.search) next.q = updates.search
    else delete next.q
  }

  if ('priceMin' in updates) {
    if (updates.priceMin !== undefined && updates.priceMin !== null) next.priceMin = updates.priceMin.toString()
    else delete next.priceMin
  }

  if ('priceMax' in updates) {
    if (updates.priceMax !== undefined && updates.priceMax !== null) next.priceMax = updates.priceMax.toString()
    else delete next.priceMax
  }

  if ('likesMin' in updates) {
    if (updates.likesMin !== undefined && updates.likesMin !== null) next.likesMin = updates.likesMin.toString()
    else delete next.likesMin
  }

  if ('viewsMin' in updates) {
    if (updates.viewsMin !== undefined && updates.viewsMin !== null) next.viewsMin = updates.viewsMin.toString()
    else delete next.viewsMin
  }

  if (updates.categories !== undefined) {
    if (updates.categories.length > 0) next.category = listQueryValue(updates.categories)
    else delete next.category
  }

  if (updates.sort !== undefined) {
    if (updates.sort) next.sort = updates.sort
    else delete next.sort
  }

  if (updates.attributeValues !== undefined) {
    if (updates.attributeValues.length > 0) next.attributeValue = listQueryValue(updates.attributeValues)
    else delete next.attributeValue
  }

  if (updates.brands !== undefined) {
    if (updates.brands.length > 0) next.brand = listQueryValue(updates.brands)
    else delete next.brand
  }

  if (updates.inStock !== undefined) {
    if (updates.inStock) next.inStock = 'true'
    else delete next.inStock
  }

  if (updates.onOffer !== undefined) {
    if (updates.onOffer) next.onOffer = 'true'
    else delete next.onOffer
  }

  return next
}

/** How many filters are active; a list filter counts once however many values it holds. */
export function countActiveFilters(filters: ProductFilters): number {
  return [
    filters.search,
    filters.priceMin !== undefined,
    filters.priceMax !== undefined,
    filters.likesMin !== undefined,
    filters.viewsMin !== undefined,
    filters.categories.length > 0,
    filters.sort,
    filters.attributeValues.length > 0,
    filters.brands.length > 0,
    filters.inStock,
    filters.onOffer,
  ].filter(Boolean).length
}

/** The active-filter badge count for each filter section of the sidebar. */
export function countFiltersBySection(filters: ProductFilters) {
  return {
    search: filters.search ? 1 : 0,
    price: (filters.priceMin !== undefined || filters.priceMax !== undefined) ? 1 : 0,
    popularity: filters.likesMin !== undefined ? 1 : 0,
    viewCount: filters.viewsMin !== undefined ? 1 : 0,
    categories: filters.categories.length,
    attributes: filters.attributeValues.length,
    brands: filters.brands.length,
    availability: Number(filters.inStock) + Number(filters.onOffer),
  }
}

/**
 * One removable chip per active filter, in display order: search, the
 * price range (a single chip for min and max), likes, views, one per
 * category, one per attribute value, sort. `t` supplies the labels.
 */
export function buildFilterChips(filters: ProductFilters, t: (key: string) => string): FilterChip[] {
  const chips: FilterChip[] = []

  if (filters.search) {
    chips.push({ key: 'search', type: 'search', label: t('filters.search'), value: filters.search })
  }

  if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
    chips.push({
      key: 'priceMin', // Use priceMin as key, but represents the range
      type: 'price',
      label: t('filters.price'),
      value: { min: filters.priceMin, max: filters.priceMax },
    })
  }

  if (filters.likesMin !== undefined) {
    chips.push({ key: 'likesMin', type: 'likes', label: t('filters.popularity'), value: filters.likesMin })
  }

  if (filters.viewsMin !== undefined) {
    chips.push({ key: 'viewsMin', type: 'views', label: t('filters.view_count'), value: filters.viewsMin })
  }

  for (const categoryId of filters.categories) {
    chips.push({ key: 'categories', type: 'category', label: t('filters.categories'), value: categoryId })
  }

  for (const attributeValueId of filters.attributeValues) {
    chips.push({ key: 'attributeValues', type: 'attribute', label: t('filters.attributes'), value: attributeValueId })
  }

  if (filters.sort) {
    chips.push({ key: 'sort', type: 'sort', label: t('filters.sort'), value: filters.sort })
  }

  return chips
}

/**
 * The redesigned listing's chips: those of `buildFilterChips`, then one per
 * brand, then in stock and on offer (`ListingFilterChip` says why they
 * are kept apart).
 */
export function buildListingFilterChips(filters: ProductFilters, t: (key: string) => string): ListingFilterChip[] {
  const chips: ListingFilterChip[] = buildFilterChips(filters, t)

  for (const brandId of filters.brands) {
    chips.push({ key: 'brands', type: 'brand', label: t('filters.brands'), value: brandId })
  }

  if (filters.inStock) {
    chips.push({ key: 'inStock', type: 'in_stock', label: t('filters.in_stock'), value: true })
  }

  if (filters.onOffer) {
    chips.push({ key: 'onOffer', type: 'on_offer', label: t('filters.on_offer'), value: true })
  }

  return chips
}

/** The URL's category filter with a listing's own category ahead of it, once. */
export function scopedCategories(categories: readonly string[], scopeCategory: number | undefined): string[] {
  const result = [...categories]
  const own = scopeCategory === undefined ? undefined : String(scopeCategory)
  if (own !== undefined && !result.includes(own)) result.unshift(own)
  return result
}

/** The in-stock and on-offer filters as a search query: a flag only when it is on. */
export function availabilityFacetQuery(filters: ProductFilters): { inStock?: true, onOffer?: true } {
  return {
    inStock: filters.inStock || undefined,
    onOffer: filters.onOffer || undefined,
  }
}

/** The same two flags as a cache-key part, empty when neither is on. */
export function availabilityFacetKey(filters: ProductFilters): string {
  return [filters.inStock ? 'inStock' : '', filters.onOffer ? 'onOffer' : ''].filter(Boolean).join(',')
}

/**
 * The update that clears every filter and keeps the sort: a listing's
 * "Clear all" sits beside the chips it removes, and the order a shopper
 * chose is not one of them.
 */
export const CLEARED_FILTERS: Partial<ProductFilters> = {
  search: '',
  priceMin: undefined,
  priceMax: undefined,
  likesMin: undefined,
  viewsMin: undefined,
  categories: [],
  attributeValues: [],
  brands: [],
  inStock: false,
  onOffer: false,
}

/**
 * Whether a chip is a filter a shopper set: every chip but the sort,
 * which has a control of its own beside them and is not cleared with
 * them.
 */
export function isFilterChip(chip: ListingFilterChip): boolean {
  return chip.type !== 'sort'
}
