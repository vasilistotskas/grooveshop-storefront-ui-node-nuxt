export type SearchResponse = {
  // Null when the query was empty/whitespace-only - the server route
  // short-circuits without hitting the backend.
  products: ProductMeiliSearchResponse | null
  blogPosts: BlogPostMeiliSearchResponse | null
}

export type SearchResult
  = | ProductMeiliSearchResult
    | BlogPostMeiliSearchResult
