import { object, string, number, union, record, lazy } from 'zod'

import { ZodUserAccount } from '~/types/user/account'
import { ZodOrderingQuery } from '~/types/ordering'
import { ZodPaginationQuery } from '~/types/pagination'
import { ZodLanguageQuery, ZodTimeStampModel, ZodUUIDModel } from '~/types'

const ZodBlogAuthorTranslations = record(
  object({
    bio: string().nullish(),
  }),
)

export const ZodBlogAuthor = object({
  translations: ZodBlogAuthorTranslations,
  id: number().int(),
  user: union([number(), lazy(() => ZodUserAccount)]),
  website: string().nullish(),
  numberOfPosts: number().int(),
  totalLikesReceived: number().int(),
})
  .merge(ZodUUIDModel)
  .merge(ZodTimeStampModel)

export const ZodBlogAuthorQuery = object({
  id: string().nullish(),
  user: string().nullish(),
})
  .merge(ZodLanguageQuery)
  .merge(ZodOrderingQuery)
  .merge(ZodPaginationQuery)

export const ZodBlogAuthorParams = object({
  id: string(),
})

export type BlogAuthor = typeof ZodBlogAuthor._type
