import { z } from 'zod'

import { ZodOrderingQuery } from '~/types/ordering'
import { ZodPaginationQuery } from '~/types/pagination'
import { ZodLanguageQuery } from '~/types/global/general'

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
  mainImageAbsoluteUrl: z.string().nullish(),
  mainImageFilename: z.string().nullish(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  uuid: z.string().uuid(),
  sortOrder: z.number().nullish(),
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
