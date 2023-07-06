import { z } from 'zod'
import { PaginationQuery } from '~/zod/pagination/pagination'
import { OrderingQuery } from '~/zod/ordering/ordering'

export const ZodCountry = z.object({
	name: z.string(),
	alpha2: z.string().min(2),
	alpha3: z.string().min(3),
	isoCc: z.number(),
	phoneCode: z.number(),
	createdAt: z.string().datetime({ offset: true }),
	updatedAt: z.string().datetime({ offset: true }),
	sortOrder: z.number().nullish(),
	uuid: z.string()
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
