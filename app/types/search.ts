import type { ZodType } from 'zod'
import { object, string, number, array, union, optional } from 'zod'
import { ZodLanguageQuery } from '~/types'
import { ZodPaginationQuery } from '~/types/pagination'

export interface SearchResult<T> {
  limit: number
  offset: number
  estimatedTotalHits: number
  results: T[]
}

export function ZodSearchResult<T>(
  zodSchema: ZodType<T>,
): ZodType<SearchResult<T>> {
  return object({
    limit: number(),
    offset: number(),
    estimatedTotalHits: number(),
    results: array(zodSchema),
  })
}

export const ZodSearchQuery = object({
  query: string().nullish(),
})
  .merge(ZodLanguageQuery)
  .merge(ZodPaginationQuery)

export const ZodSearchProduct = object({
  id: number(),
  languageCode: string(),
  name: string(),
  description: string().nullish(),
  absoluteUrl: string(),
  mainImagePath: optional(string()),
  matchesPosition: object({
    body: array(
      object({
        start: number(),
        length: number(),
      }),
    ).nullish(),
  }).nullish(),
  rankingScore: number().nullish(),
  formatted: object({
    name: string(),
    description: string().nullish(),
    languageCode: string(),
    id: string(),
  }).nullish(),
})

export const ZodSearchBlogPost = object({
  id: number(),
  languageCode: string(),
  title: string(),
  subtitle: string().nullish(),
  body: string(),
  master: number(),
  absoluteUrl: string(),
  mainImagePath: optional(string()),
  matchesPosition: object({
    body: array(
      object({
        start: number(),
        length: number(),
      }),
    ).nullish(),
  }).nullish(),
  rankingScore: number().nullish(),
  formatted: object({
    title: string(),
    subtitle: string().nullish(),
    body: string(),
    languageCode: string(),
    id: string(),
  }).nullish(),
})

export const ZodSearchProductResult = ZodSearchResult(ZodSearchProduct)
export const ZodSearchBlogPostResult = ZodSearchResult(ZodSearchBlogPost)

export const ZodSearchResponse = object({
  products: union([ZodSearchProductResult, optional(ZodSearchProductResult)]),
  blogPosts: union([ZodSearchBlogPostResult, optional(ZodSearchBlogPostResult)]),
})

export type SearchResponse = typeof ZodSearchResponse._type
export type SearchProduct = typeof ZodSearchProduct._type
export type SearchBlogPost = typeof ZodSearchBlogPost._type
