import { z } from 'zod'

import { ZodBlogPost } from '~/types/blog/post'
import { ZodUserAccount } from '~/types/user/account'
import { ZodOrderingQuery } from '~/types/ordering'
import { ZodPaginationQuery } from '~/types/pagination'
import { ZodExpandQuery, ZodLanguageQuery } from '~/types/global/general'

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
  likes: z.union([z.array(z.number()), z.array(z.lazy(() => ZodUserAccount))]),
  user: z.union([z.number(), z.lazy(() => ZodUserAccount)]),
  post: z.union([z.number(), z.lazy(() => ZodBlogPost)]),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  uuid: z.string().uuid(),
  likesCount: z.number().int(),
  repliesCount: z.number().int(),
})

export const ZodBlogCommentQuery = z
  .object({
    id: z.string().nullish(),
    user: z.string().nullish(),
    post: z.string().nullish(),
  })
  .merge(ZodLanguageQuery)
  .merge(ZodExpandQuery)
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
  .merge(ZodExpandQuery)

export const ZodBlogCommentPutBody = z.object({
  product: z.string(),
  user: z.string(),
  translations: ZodBlogCommentTranslations,
})

export const ZodBlogCommentUserBlogCommentBody = z.object({
  post: z.string(),
  user: z.string(),
})

export type BlogComment = z.infer<typeof ZodBlogCommentBase> & {
  children?: BlogComment[] | null | number[]
}
export type BlogCommentOrderingField = 'id' | 'userId' | 'postId' | 'createdAt'

export const ZodBlogComment: z.ZodType<BlogComment> = ZodBlogCommentBase.extend(
  {
    children: z.lazy(() =>
      z.union([ZodBlogComment.array().nullish(), z.array(z.number())]),
    ),
  },
)
