import { z } from 'zod'
import { ZodLanguageQuery } from '~/types'

export interface SearchResult<T> {
  results: T[]
  headlines: Record<string, string>
  searchRanks: Record<string, number>
  resultCount: number
  similarities: Record<string, number>
  distances: Record<string, number>
}

export function ZodSearchResult<T>(
  zodSchema: z.ZodType<T>,
): z.ZodType<SearchResult<T>> {
  return z.object({
    results: z.array(zodSchema),
    headlines: z.record(z.string()),
    searchRanks: z.record(z.number()),
    resultCount: z.number(),
    similarities: z.record(z.number()),
    distances: z.record(z.number()),
  })
}

export const ZodSearchQuery = z
  .object({
    query: z.string().nullish(),
  })
  .merge(ZodLanguageQuery)

const ZodSearchProductTranslations = z.record(
  z.object({
    name: z.string().nullish(),
    description: z.string().nullish(),
    searchDocument: z.string().nullish(),
    searchVector: z.string().nullish(),
    searchDocumentDirty: z.boolean().nullish(),
    searchVectorDirty: z.boolean().nullish(),
  }),
)

const ZodSearchBlogPostTranslations = z.record(
  z.object({
    title: z.string().nullish(),
    subtitle: z.string().nullish(),
    body: z.string().nullish(),
    searchVector: z.string().nullish(),
    searchDocumentDirty: z.boolean().nullish(),
    searchVectorDirty: z.boolean().nullish(),
  }),
)

export const ZodSearchProduct = z.object({
  id: z.number(),
  slug: z.string(),
  mainImageFilename: z.string().nullish(),
  absoluteUrl: z.string(),
  translations: ZodSearchProductTranslations,
  searchRank: z.number(),
  headline: z.string(),
  similarity: z.number(),
})

export const ZodSearchBlogPost = z.object({
  id: z.number(),
  slug: z.string(),
  mainImageFilename: z.string().nullish(),
  absoluteUrl: z.string(),
  translations: ZodSearchBlogPostTranslations,
  searchRank: z.number(),
  headline: z.string(),
  similarity: z.number(),
})

export const ZodSearchProductResult = ZodSearchResult(ZodSearchProduct)
export const ZodSearchBlogPostResult = ZodSearchResult(
  ZodSearchBlogPost,
)

export const ZodSearchResults = z.object({
  products: z.union([z.undefined(), z.null(), ZodSearchProductResult]),
  blogPosts: z.union([
    z.undefined(),
    z.null(),
    ZodSearchBlogPostResult,
  ]),
})

export type SearchResults = z.infer<typeof ZodSearchResults>
export type SearchProduct = z.infer<typeof ZodSearchProduct>
export type SearchBlogPost = z.infer<typeof ZodSearchBlogPost>
