import { object, string, number, record, optional } from 'zod'

import { ZodOrderingQuery } from '~/types/ordering'
import { ZodPaginationQuery } from '~/types/pagination'
import { ZodLanguageQuery, ZodSortableModel, ZodTimeStampModel, ZodUUIDModel } from '~/types'

const ZodCountryTranslations = record(
  object({
    name: string().nullish(),
  }),
)

export const ZodCountry = object({
  translations: ZodCountryTranslations,
  alpha2: string().min(2),
  alpha3: string().min(3),
  isoCc: optional(number()),
  phoneCode: optional(number()),
})
  .merge(ZodUUIDModel)
  .merge(ZodTimeStampModel)
  .merge(ZodSortableModel)

export const ZodCountriesQuery = object({
  alpha2: string().nullish(),
  alpha3: string().nullish(),
  name: string().nullish(),
  isoCc: optional(string()),
  phoneCode: optional(string()),
})
  .merge(ZodLanguageQuery)
  .merge(ZodOrderingQuery)
  .merge(ZodPaginationQuery)

export type Country = typeof ZodCountry._type
