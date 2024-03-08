import type { LocationQueryValue } from 'vue-router'
import { z } from 'zod'

import { ZodBlogAuthor } from '~/types/blog/author'
import { ZodBlogCategory } from '~/types/blog/category'
import { ZodBlogTag } from '~/types/blog/tag'
import type { OrderingQuery } from '~/types/ordering'
import type { PaginationQuery } from '~/types/pagination'
import { ZodUserAccount } from '~/types/user/account'

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
  mainImageAbsoluteUrl: z.string().nullish(),
  mainImageFilename: z.string().nullish(),
  likesCount: z.number().int(),
  commentsCount: z.number().int(),
  tagsCount: z.number().int(),
  absoluteUrl: z.string(),
})

export const ZodBlogPostQuery = z.object({
  page: z.string().nullish(),
  ordering: z.string().nullish(),
  id: z.string().nullish(),
  author: z.string().nullish(),
  slug: z.string().nullish(),
  tags: z.string().nullish(),
  expand: z.union([z.literal('true'), z.literal('false')]).nullish(),
})

export const ZodBlogPostParams = z.object({
  id: z.string(),
})

export type BlogPost = z.infer<typeof ZodBlogPost>
export type BlogPostQuery = PaginationQuery &
  OrderingQuery & {
    id?: string | LocationQueryValue[] | undefined
    author?: string | LocationQueryValue[] | undefined
    slug?: string | LocationQueryValue[] | undefined
    tags?: string | LocationQueryValue[] | undefined
    expand?: string | undefined
  }
export type BlogPostParams = z.infer<typeof ZodBlogPostParams>
export type BlogPostOrderingField = 'createdAt' | 'title' | `publishedAt`
