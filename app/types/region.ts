import { object, string, record, union, lazy } from 'zod'

import { ZodCountry } from '~/types/country'
import { ZodOrderingQuery } from '~/types/ordering'
import { ZodPaginationQuery } from '~/types/pagination'
import { ZodLanguageQuery, ZodSortableModel, ZodTimeStampModel, ZodUUIDModel } from '~/types'

const ZodRegionTranslations = record(
  object({
    name: string().nullish(),
  }),
)

export const ZodRegion = object({
  translations: ZodRegionTranslations,
  alpha: string().min(3),
  country: union([string(), lazy(() => ZodCountry)]).nullish(),
})
  .merge(ZodUUIDModel)
  .merge(ZodTimeStampModel)
  .merge(ZodSortableModel)

export const ZodRegionsQuery = object({
  name: string().nullish(),
  alpha: string().nullish(),
  country: string().nullish(),
})
  .merge(ZodLanguageQuery)
  .merge(ZodOrderingQuery)
  .merge(ZodPaginationQuery)

export type Region = typeof ZodRegion._type
