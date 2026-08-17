export type SearchResponse = {
  // Null when the query was empty/whitespace-only - the server route
  // short-circuits without hitting the backend.
  products: ProductMeiliSearchResponse | null
  blogPosts: BlogPostMeiliSearchResponse | null
}

// Federated hits type master/slug as optional in the generated schema,
// but the backend enrichment always serializes both (each hit passes
// through the per-type translation serializers, where they are
// required). The refinement keeps every SearchResult consumer strict.
export type EnrichedFederatedSearchResult = FederatedSearchResult & {
  master: number
  slug: string
}

export type SearchResult
  = | ProductMeiliSearchResult
    | BlogPostMeiliSearchResult
    | EnrichedFederatedSearchResult
