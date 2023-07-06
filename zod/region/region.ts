import { z } from 'zod'
import { PaginationQuery } from '~/zod/pagination/pagination'
import { OrderingQuery } from '~/zod/ordering/ordering'

export const ZodRegion = z.object({
	alpha: z.string().min(3),
	alpha2: z.string().min(2),
	name: z.string(),
	createdAt: z.string().datetime({ offset: true }),
	updatedAt: z.string().datetime({ offset: true }),
	sortOrder: z.number().nullish(),
	uuid: z.string()
})

export const ZodRegionsQuery = z.object({
	offset: z.string().nullish(),
	limit: z.string().nullish(),
	ordering: z.string().nullish(),
	name: z.string().nullish(),
	alpha: z.string().nullish(),
	alpha2: z.string().nullish()
})

export type Region = z.infer<typeof ZodRegion>
export type RegionsQuery = PaginationQuery &
	OrderingQuery & {
		name?: string | undefined
		alpha?: string | undefined
		alpha2?: string | undefined
	}
