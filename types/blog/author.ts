import { z } from 'zod'

import { ZodUserAccount } from '~/types/user/account'

const ZodBlogAuthorTranslations = z.record(
  z.object({
    bio: z.string().nullish(),
  }),
)

export const ZodBlogAuthor = z.object({
  translations: ZodBlogAuthorTranslations,
  id: z.number().int(),
  user: z.union([z.number(), z.lazy(() => ZodUserAccount)]),
  website: z.string().nullish(),
  numberOfPosts: z.number().int(),
  totalLikesReceived: z.number().int(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  uuid: z.string().uuid(),
})

export const ZodBlogAuthorQuery = z.object({
  page: z.string().nullish(),
  ordering: z.string().nullish(),
  id: z.string().nullish(),
  user: z.string().nullish(),
})

export const ZodBlogAuthorParams = z.object({
  id: z.string(),
})

export type BlogAuthor = z.infer<typeof ZodBlogAuthor>
export type BlogAuthorQuery = z.infer<typeof ZodBlogAuthorQuery>
export type BlogAuthorParams = z.infer<typeof ZodBlogAuthorParams>
