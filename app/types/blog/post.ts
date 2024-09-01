import { z } from 'zod'

import { ZodBlogAuthor } from '~/types/blog/author'
import { ZodBlogCategory } from '~/types/blog/category'
import { ZodBlogTag } from '~/types/blog/tag'
import { ZodUserAccount } from '~/types/user/account'
import { ZodOrderingQuery } from '~/types/ordering'
import { ZodPaginationQuery } from '~/types/pagination'
import { ZodExpandQuery, ZodLanguageQuery } from '~/types'

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
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  publishedAt: z.string().datetime({ offset: true }).nullish(),
  isPublished: z.boolean(),
  uuid: z.string().uuid(),
  mainImagePath: z.string().nullish(),
  likesCount: z.number().int(),
  commentsCount: z.number().int(),
  tagsCount: z.number().int(),
  absoluteUrl: z.string(),
})

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

export type BlogPost = z.infer<typeof ZodBlogPost>
export type BlogPostOrderingField =
  | 'title'
  | 'createdAt'
  | 'updatedAt'
  | 'publishedAt'
