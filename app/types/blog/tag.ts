import { object, string, number, boolean, record } from 'zod'
import { ZodOrderingQuery } from '~/types/ordering'
import { ZodPaginationQuery } from '~/types/pagination'
import { ZodLanguageQuery, ZodSortableModel, ZodTimeStampModel, ZodUUIDModel } from '~/types'

const ZodBlogTagTranslations = record(
  object({
    name: string().nullish(),
  }),
)

export const ZodBlogTag = object({
  translations: ZodBlogTagTranslations,
  id: number().int(),
  active: boolean(),
})
  .merge(ZodUUIDModel)
  .merge(ZodTimeStampModel)
  .merge(ZodSortableModel)

export const ZodBlogTagQuery = object({
  id: string().nullish(),
  active: string().nullish(),
})
  .merge(ZodLanguageQuery)
  .merge(ZodOrderingQuery)
  .merge(ZodPaginationQuery)

export const ZodBlogTagParams = object({
  id: string(),
})

export type BlogTag = typeof ZodBlogTag._type
