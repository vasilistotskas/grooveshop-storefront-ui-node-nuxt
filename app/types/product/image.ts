import * as z from 'zod'

import { ZodOrderingQuery } from '~/types/ordering'
import { ZodPaginationQuery } from '~/types/pagination'
import { ZodLanguageQuery, ZodSortableModel, ZodTimeStampModel, ZodUUIDModel } from '~/types'

const ZodProductImageTranslations = z.record(
  z.object({
    title: z.string().nullish(),
  }),
)

export const ZodProductImage = z.object({
  id: z.number(),
  translations: ZodProductImageTranslations,
  product: z.number(),
  image: z.string(),
  thumbnail: z.string().nullish(),
  isMain: z.boolean(),
  mainImagePath: z.string().optional(),
}).merge(ZodUUIDModel).merge(ZodTimeStampModel).merge(ZodSortableModel)

export const ZodProductImageParams = z.object({
  id: z.string(),
})

export const ZodProductImageQuery = z
  .object({
    id: z.string().nullish(),
    product: z.string().nullish(),
    isMain: z.string().nullish(),
  })
  .merge(ZodLanguageQuery)
  .merge(ZodOrderingQuery)
  .merge(ZodPaginationQuery)

export type ProductImage = z.infer<typeof ZodProductImage>
