import type { ZodType } from 'zod'
import { object, string, number, boolean, array, union, record, lazy } from 'zod'

import { ZodBlogPost } from '~/types/blog/post'
import { ZodUserAccount } from '~/types/user/account'
import { ZodOrderingQuery } from '~/types/ordering'
import { ZodPaginationQuery } from '~/types/pagination'
import { ZodExpandQuery, ZodLanguageQuery, ZodTimeStampModel } from '~/types'

const ZodBlogCommentTranslations = record(
  object({
    content: string().nullish(),
  }),
)

export const ZodBlogCommentBase = object({
  translations: ZodBlogCommentTranslations,
  id: number().int(),
  isApproved: boolean(),
  parent: number().nullish(),
  level: number().nullish(),
  treeId: number().nullish(),
  likes: union([array(number()), array(lazy(() => ZodUserAccount))]),
  user: union([number(), lazy(() => ZodUserAccount)]),
  post: union([number(), lazy(() => ZodBlogPost)]),
  likesCount: number().int(),
  repliesCount: number().int(),
}).merge(ZodTimeStampModel)

export const ZodBlogCommentQuery = object({
  id: string().nullish(),
  user: string().nullish(),
  post: string().nullish(),
})
  .merge(ZodLanguageQuery)
  .merge(ZodExpandQuery)
  .merge(ZodOrderingQuery)
  .merge(ZodPaginationQuery)

export const ZodBlogCommentParams = object({
  id: string(),
})

export const ZodBlogCommentCreateBody = object({
  post: string(),
  user: string(),
  translations: ZodBlogCommentTranslations,
  parent: number().nullish(),
})

export const ZodBlogCommentCreateQuery = object({})
  .merge(ZodLanguageQuery)
  .merge(ZodExpandQuery)

export const ZodBlogCommentPutBody = object({
  product: string(),
  user: string(),
  translations: ZodBlogCommentTranslations,
})

export const ZodBlogCommentUserBlogCommentBody = object({
  post: string(),
})

export const ZodBlogCommentsLikedCommentsBody = object({
  commentIds: array(number()),
})

export type BlogComment = typeof ZodBlogCommentBase._type & {
  children?: BlogComment[] | null | number[]
}
export type BlogCommentOrderingField = 'id' | 'userId' | 'postId' | 'createdAt'

export const ZodBlogComment: ZodType<BlogComment> = ZodBlogCommentBase.extend({
  children: lazy(() =>
    union([ZodBlogComment.array().nullish(), array(number())]),
  ),
})
