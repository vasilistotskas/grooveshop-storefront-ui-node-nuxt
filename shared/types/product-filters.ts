export interface ProductFilters {
  /** Full-text search query */
  search: string
  /** Minimum price filter */
  priceMin: number | undefined
  /** Maximum price filter */
  priceMax: number | undefined
  /** Minimum likes threshold */
  likesMin: number | undefined
  /** Minimum views threshold */
  viewsMin: number | undefined
  /** Selected category IDs */
  categories: string[]
  /** Sort field and direction */
  sort: string
  /** Selected attribute value IDs */
  attributeValues: string[]
}

/** Chip-value shape for the price-range chip. */
export interface PriceRangeFilterValue {
  min: number | undefined
  max: number | undefined
}

interface FilterChipBase {
  /** Filter key for removal */
  key: keyof ProductFilters
  /** Display label */
  label: string
}

/** Discriminated union of filter chips — narrowing on ``type`` lets
 *  consumers read ``chip.value`` with the right shape and no casts. */
export type FilterChip
  = | (FilterChipBase & { type: 'search' | 'sort' | 'category' | 'attribute', value: string })
    | (FilterChipBase & { type: 'likes' | 'views', value: number })
    | (FilterChipBase & { type: 'price', value: PriceRangeFilterValue })

export type FilterChipValue = FilterChip['value']
