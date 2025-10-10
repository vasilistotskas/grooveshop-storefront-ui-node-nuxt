export type SearchResponse = {
  products: ProductMeiliSearchResponse
  blogPosts: BlogPostMeiliSearchResponse
}

export type SearchResult = ProductMeiliSearchResult | BlogPostMeiliSearchResult

export function isProductResult(
  result: SearchResult,
): result is ProductMeiliSearchResult {
  return result.contentType === 'product'
}

export function isBlogPostResult(
  result: SearchResult,
): result is BlogPostMeiliSearchResult {
  return result.contentType === 'blog_post'
}
