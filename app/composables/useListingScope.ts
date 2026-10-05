import type { InjectionKey } from 'vue'

/**
 * What a product listing is about, handed from the listing
 * (`Products/Browse.vue`) to the filter controls and chips inside it.
 * Each of them passes it to `useProductSearchData`, so every reader of a
 * facet asks with the same scope — and so under the same key, one
 * request between them.
 */
export interface ListingScope {
  /** The category page's own category; absent on the store-wide listing. */
  categoryId: number | undefined
  /**
   * Brands, in stock and on offer narrow this listing's facets. Only the
   * redesigned listing says so: the frozen webside listing does not read
   * this scope, and a link carrying those filters must not narrow its facets.
   */
  listingFilters: true
}

const LISTING_SCOPE: InjectionKey<ListingScope> = Symbol('listing-scope')

export function provideListingScope(scope: ListingScope) {
  provide(LISTING_SCOPE, scope)
}

/** The enclosing listing's scope; outside one, the whole store. */
export function useListingScope(): ListingScope {
  return inject(LISTING_SCOPE, { categoryId: undefined, listingFilters: true })
}
