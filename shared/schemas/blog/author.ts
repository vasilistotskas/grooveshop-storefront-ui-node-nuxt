import * as z from 'zod'

const ZodBlogAuthorTranslations = z.record(
  z.object({
    bio: z.string().nullish(),
  }),
)

export const ZodBlogAuthor = z.object({
  translations: ZodBlogAuthorTranslations,
  id: z.number().int(),
  user: z.number(),
  website: z.string().nullish(),
  fullName: z.string().nullish(),
  image: z.string().nullish(),
  numberOfPosts: z.number().int(),
  totalLikesReceived: z.number().int(),
}).merge(ZodUUIDModel).merge(ZodTimeStampModel)

export const ZodBlogAuthorQuery = z
  .object({
    id: z.string().nullish(),
    user: z.string().nullish(),
  })
  .merge(ZodLanguageQuery)
  .merge(ZodOrderingQuery)
  .merge(ZodPaginationQuery)

export const ZodBlogAuthorParams = z.object({
  id: z.string(),
})
