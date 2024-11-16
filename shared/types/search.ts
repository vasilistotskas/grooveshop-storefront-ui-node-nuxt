import type * as z from 'zod'

export interface SearchResult<T> {
  limit: number
  offset: number
  estimatedTotalHits: number
  results: T[]
}

export type SearchResponse = z.infer<typeof ZodSearchResponse>
export type SearchProduct = z.infer<typeof ZodSearchProduct>
export type SearchBlogPost = z.infer<typeof ZodSearchBlogPost>
