import { object, string, number, boolean, record, optional } from 'zod'

import { ZodOrderingQuery } from '~/types/ordering'
import { ZodPaginationQuery } from '~/types/pagination'
import { ZodLanguageQuery, ZodSortableModel, ZodTimeStampModel, ZodUUIDModel } from '~/types'

const ZodProductImageTranslations = record(
  object({
    title: string().nullish(),
  }),
)

export const ZodProductImage = object({
  id: number(),
  translations: ZodProductImageTranslations,
  product: number(),
  image: string(),
  thumbnail: string().nullish(),
  isMain: boolean(),
  mainImagePath: optional(string()),
})
  .merge(ZodUUIDModel)
  .merge(ZodTimeStampModel)
  .merge(ZodSortableModel)

export const ZodProductImageParams = object({
  id: string(),
})

export const ZodProductImageQuery = object({
  id: string().nullish(),
  product: string().nullish(),
  isMain: string().nullish(),
})
  .merge(ZodLanguageQuery)
  .merge(ZodOrderingQuery)
  .merge(ZodPaginationQuery)

export type ProductImage = typeof ZodProductImage._type
