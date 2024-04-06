import { z } from 'zod'

import { ZodOrderingQuery } from '~/types/ordering'
import { ZodPaginationQuery } from '~/types/pagination'
import { ZodLanguageQuery } from '~/types/global/general'

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
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  sortOrder: z.number().nullish(),
  uuid: z.string().uuid(),
})

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
