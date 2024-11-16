import * as z from 'zod'

export const ZodSearchQuery = z
  .object({
    query: z.string().nullish(),
  })
  .merge(ZodLanguageQuery)
  .merge(ZodPaginationQuery)

export const ZodSearchProduct = z.object({
  id: z.number(),
  languageCode: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  absoluteUrl: z.string(),
  mainImagePath: z.string().optional(),
  matchesPosition: z.object({
    body: z.array(z.object({
      start: z.number(),
      length: z.number(),
    })).nullish(),
  }).nullish(),
  rankingScore: z.number().nullish(),
  formatted: z.object({
    name: z.string(),
    description: z.string().nullish(),
    languageCode: z.string(),
    id: z.string(),
  }).nullish(),
})

export const ZodSearchBlogPost = z.object({
  id: z.number(),
  languageCode: z.string(),
  title: z.string(),
  subtitle: z.string().nullish(),
  body: z.string(),
  master: z.number(),
  absoluteUrl: z.string(),
  mainImagePath: z.string().optional(),
  matchesPosition: z.object({
    body: z.array(z.object({
      start: z.number(),
      length: z.number(),
    })).nullish(),
  }).nullish(),
  rankingScore: z.number().nullish(),
  formatted: z.object({
    title: z.string(),
    subtitle: z.string().nullish(),
    body: z.string(),
    languageCode: z.string(),
    id: z.string(),
  }).nullish(),
})

export const ZodSearchProductResult = ZodSearchResult(ZodSearchProduct)
export const ZodSearchBlogPostResult = ZodSearchResult(
  ZodSearchBlogPost,
)

export const ZodSearchResponse = z.object({
  products: z.union([
    z.undefined(),
    z.null(),
    ZodSearchProductResult,
  ]),
  blogPosts: z.union([
    z.undefined(),
    z.null(),
    ZodSearchBlogPostResult,
  ]),
})
