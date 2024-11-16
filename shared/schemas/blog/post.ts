import * as z from 'zod'

export const ZodBlogPostStatusEnum = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])

const ZodBlogPostTranslations = z.record(
  z.object({
    title: z.string().nullish(),
    subtitle: z.string().nullish(),
    body: z.string().nullish(),
  }),
)

export const ZodBlogPost = z.object({
  translations: ZodBlogPostTranslations,
  id: z.number().int(),
  slug: z.string().nullish(),
  likes: z.union([z.array(z.number()), z.array(z.lazy(() => ZodUserAccount))]),
  category: z.union([z.number(), z.lazy(() => ZodBlogCategory)]),
  tags: z.union([z.array(z.number()), z.array(z.lazy(() => ZodBlogTag))]),
  author: z.union([z.number(), z.lazy(() => ZodBlogAuthor)]),
  status: z.lazy(() => ZodBlogPostStatusEnum),
  featured: z.boolean(),
  viewCount: z.number().int(),
  mainImagePath: z.string().optional(),
  likesCount: z.number().int(),
  commentsCount: z.number().int(),
  tagsCount: z.number().int(),
  absoluteUrl: z.string(),
}).merge(ZodTimeStampModel)
  .merge(ZodSeoModel)
  .merge(ZodPublishableModel)
  .merge(ZodUUIDModel)

export const ZodBlogPostQuery = z
  .object({
    id: z.string().nullish(),
    author: z.string().nullish(),
    slug: z.string().nullish(),
    tags: z.string().nullish(),
    parent: z.literal('none').nullish(),
  })
  .merge(ZodLanguageQuery)
  .merge(ZodExpandQuery)
  .merge(ZodOrderingQuery)
  .merge(ZodPaginationQuery)

export const ZodBlogPostParams = z.object({
  id: z.string(),
})

export const ZodBlogPostsLikedPostsBody = z.object({
  postIds: z.array(z.number()),
})
