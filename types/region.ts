import { z } from 'zod'

import { ZodCountry } from '~/types/country'
import { ZodOrderingQuery } from '~/types/ordering'
import { ZodPaginationQuery } from '~/types/pagination'
import { ZodLanguageQuery } from '~/types'

const ZodRegionTranslations = z.record(
  z.object({
    name: z.string().nullish(),
  }),
)

export const ZodRegion = z.object({
  translations: ZodRegionTranslations,
  alpha: z.string().min(3),
  country: z.union([z.string(), z.lazy(() => ZodCountry)]).nullish(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  sortOrder: z.number().nullish(),
  uuid: z.string().uuid(),
})

export const ZodRegionsQuery = z
  .object({
    name: z.string().nullish(),
    alpha: z.string().nullish(),
    country: z.string().nullish(),
  })
  .merge(ZodLanguageQuery)
  .merge(ZodOrderingQuery)
  .merge(ZodPaginationQuery)

export type Region = z.infer<typeof ZodRegion>
