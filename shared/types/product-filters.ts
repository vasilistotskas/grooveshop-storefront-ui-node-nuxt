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

export interface FilterChip {
  /** Filter key for removal */
  key: keyof ProductFilters
  /** Filter type for formatting */
  type: 'search' | 'price' | 'likes' | 'views' | 'category' | 'sort' | 'attribute'
  /** Display label */
  label: string
  /** Filter value */
  value: any
}
