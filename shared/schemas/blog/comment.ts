import * as z from 'zod'

const ZodBlogCommentTranslations = z.record(
  z.object({
    content: z.string().nullish(),
  }),
)

export const ZodBlogCommentBase = z.object({
  translations: ZodBlogCommentTranslations,
  id: z.number().int(),
  isApproved: z.boolean(),
  parent: z.number().nullish(),
  level: z.number().nullish(),
  treeId: z.number().nullish(),
  likes: z.array(z.number()),
  user: z.number(),
  post: z.number(),
  likesCount: z.number().int(),
  repliesCount: z.number().int(),
}).merge(ZodTimeStampModel)

export const ZodBlogCommentQuery = z
  .object({
    id: z.string().nullish(),
    user: z.string().nullish(),
    post: z.string().nullish(),
  })
  .merge(ZodLanguageQuery)
  .merge(ZodOrderingQuery)
  .merge(ZodPaginationQuery)

export const ZodBlogCommentParams = z.object({
  id: z.string(),
})

export const ZodBlogCommentCreateBody = z.object({
  post: z.string(),
  user: z.string(),
  translations: ZodBlogCommentTranslations,
  parent: z.number().nullish(),
})

export const ZodBlogCommentCreateQuery = z
  .object({})
  .merge(ZodLanguageQuery)

export const ZodBlogCommentPutBody = z.object({
  product: z.string(),
  user: z.string(),
  translations: ZodBlogCommentTranslations,
})

export const ZodBlogCommentUserBlogCommentBody = z.object({
  post: z.string(),
})

export const ZodBlogCommentsLikedCommentsBody = z.object({
  commentIds: z.array(z.number()),
})

export const ZodBlogComment: z.ZodType<BlogComment> = ZodBlogCommentBase.extend(
  {
    children: z.lazy(() =>
      z.array(z.number()),
    ),
  },
)
