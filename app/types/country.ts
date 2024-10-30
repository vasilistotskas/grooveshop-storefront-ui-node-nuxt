import * as z from 'zod'

import { ZodOrderingQuery } from '~/types/ordering'
import { ZodPaginationQuery } from '~/types/pagination'
import { ZodLanguageQuery, ZodSortableModel, ZodTimeStampModel, ZodUUIDModel } from '~/types'

const ZodCountryTranslations = z.record(
  z.object({
    name: z.string().nullish(),
  }),
)

export const ZodCountry = z.object({
  translations: ZodCountryTranslations,
  alpha2: z.string().min(2),
  alpha3: z.string().min(3),
  isoCc: z.number().nullish(),
  phoneCode: z.number().nullish(),
}).merge(ZodUUIDModel).merge(ZodTimeStampModel).merge(ZodSortableModel)

export const ZodCountriesQuery = z
  .object({
    alpha2: z.string().nullish(),
    alpha3: z.string().nullish(),
    name: z.string().nullish(),
    isoCc: z.string().nullish(),
    phoneCode: z.string().nullish(),
  })
  .merge(ZodLanguageQuery)
  .merge(ZodOrderingQuery)
  .merge(ZodPaginationQuery)

export type Country = z.infer<typeof ZodCountry>
