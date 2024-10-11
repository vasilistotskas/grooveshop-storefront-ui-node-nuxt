import { object, string, number, boolean, array, union, lazy, record, enum as zEnum, literal, optional } from 'zod'

import { ZodBlogAuthor } from '~/types/blog/author'
import { ZodBlogCategory } from '~/types/blog/category'
import { ZodBlogTag } from '~/types/blog/tag'
import { ZodUserAccount } from '~/types/user/account'
import { ZodOrderingQuery } from '~/types/ordering'
import { ZodPaginationQuery } from '~/types/pagination'
import {
  ZodExpandQuery,
  ZodLanguageQuery,
  ZodPublishableModel,
  ZodSeoModel,
  ZodTimeStampModel,
  ZodUUIDModel,
} from '~/types'

export const ZodBlogPostStatusEnum = zEnum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])

const ZodBlogPostTranslations = record(
  object({
    title: string().nullish(),
    subtitle: string().nullish(),
    body: string().nullish(),
  }),
)

export const ZodBlogPost = object({
  translations: ZodBlogPostTranslations,
  id: number().int(),
  slug: string().nullish(),
  likes: union([array(number()), array(lazy(() => ZodUserAccount))]),
  category: union([number(), lazy(() => ZodBlogCategory)]),
  tags: union([array(number()), array(lazy(() => ZodBlogTag))]),
  author: union([number(), lazy(() => ZodBlogAuthor)]),
  status: lazy(() => ZodBlogPostStatusEnum),
  featured: boolean(),
  viewCount: number().int(),
  mainImagePath: optional(string()),
  likesCount: number().int(),
  commentsCount: number().int(),
  tagsCount: number().int(),
  absoluteUrl: string(),
})
  .merge(ZodTimeStampModel)
  .merge(ZodSeoModel)
  .merge(ZodPublishableModel)
  .merge(ZodUUIDModel)

export const ZodBlogPostQuery = object({
  id: string().nullish(),
  author: string().nullish(),
  slug: string().nullish(),
  tags: string().nullish(),
  parent: literal('none').nullish(),
})
  .merge(ZodLanguageQuery)
  .merge(ZodExpandQuery)
  .merge(ZodOrderingQuery)
  .merge(ZodPaginationQuery)

export const ZodBlogPostParams = object({
  id: string(),
})

export const ZodBlogPostsLikedPostsBody = object({
  postIds: array(number()),
})

export type BlogPost = typeof ZodBlogPost._type
export type BlogPostOrderingField =
  | 'title'
  | 'createdAt'
  | 'updatedAt'
  | 'publishedAt'
