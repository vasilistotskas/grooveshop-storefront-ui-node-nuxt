import { z } from 'zod'

import type { OrderingQuery } from '~/types/ordering'
import type { PaginationQuery } from '~/types/pagination'

const ZodCountryTranslations = z.record(
	z.object({
		name: z.string().nullish()
	})
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
	uuid: z.string().uuid()
})

export const ZodCountriesQuery = z.object({
	offset: z.string().nullish(),
	limit: z.string().nullish(),
	ordering: z.string().nullish(),
	alpha2: z.string().nullish(),
	alpha3: z.string().nullish(),
	name: z.string().nullish(),
	isoCc: z.string().nullish(),
	phoneCode: z.string().nullish()
})

export type Country = z.infer<typeof ZodCountry>
export type CountriesQuery = PaginationQuery &
	OrderingQuery & {
		alpha2?: string | undefined
		alpha3?: string | undefined
		name?: string | undefined
		isoCc?: string | undefined
		phoneCode?: string | undefined
	}
