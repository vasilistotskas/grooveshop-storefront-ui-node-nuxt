import { z } from 'zod'

export interface SearchResult<T> {
  results: T[]
  headlines: Record<string, string>
  searchRanks: Record<string, number>
  resultCount: number
  similarities: Record<string, number>
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
  })
}

export const ZodSearchQuery = z.object({
  query: z.string().nullish(),
  language: z.string().nullish(),
})

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

const ZodSearchProductCategoryTranslations = z.record(
  z.object({
    name: z.string().nullish(),
    description: z.string().nullish(),
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

export const ZodSearchProductCategory = z.object({
  id: z.number(),
  slug: z.string(),
  absoluteUrl: z.string(),
  translations: ZodSearchProductCategoryTranslations,
  searchRank: z.number(),
  headline: z.string(),
  similarity: z.number(),
})

export const ZodSearchProductResult = ZodSearchResult(ZodSearchProduct)
export const ZodSearchProductCategoryResult = ZodSearchResult(
  ZodSearchProductCategory,
)

export const ZodSearchResults = z.object({
  products: z.union([z.undefined(), z.null(), ZodSearchProductResult]),
  productCategories: z.union([
    z.undefined(),
    z.null(),
    ZodSearchProductCategoryResult,
  ]),
})

export type SearchQuery = z.infer<typeof ZodSearchQuery>
export type SearchResults = z.infer<typeof ZodSearchResults>
export type SearchProduct = z.infer<typeof ZodSearchProduct>
export type SearchProductResult = z.infer<typeof ZodSearchProductResult>
export type SearchProductTranslations = z.infer<
  typeof ZodSearchProductTranslations
>
