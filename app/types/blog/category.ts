import { object, string, number, optional, record } from 'zod'
import { ZodOrderingQuery } from '~/types/ordering'
import { ZodPaginationQuery } from '~/types/pagination'
import { ZodLanguageQuery, ZodSortableModel, ZodTimeStampModel, ZodUUIDModel } from '~/types'

const ZodBlogCategoryTranslations = record(
  object({
    name: string().nullish(),
    description: string().nullish(),
  }),
)

export const ZodBlogCategory = object({
  translations: ZodBlogCategoryTranslations,
  id: number().int(),
  slug: string().nullish(),
  parent: number().nullish(),
  level: number().nullish(),
  treeId: number().nullish(),
  absoluteUrl: string().nullish(),
  recursivePostCount: number().int(),
  mainImagePath: optional(string()),
})
  .merge(ZodUUIDModel)
  .merge(ZodTimeStampModel)
  .merge(ZodSortableModel)

export const ZodBlogCategoryQuery = object({
  id: string().nullish(),
})
  .merge(ZodLanguageQuery)
  .merge(ZodOrderingQuery)
  .merge(ZodPaginationQuery)

export const ZodBlogCategoryParams = object({
  id: string(),
})

export type BlogCategory = typeof ZodBlogCategory._type
