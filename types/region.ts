import { z } from 'zod'
import type { PaginationQuery } from '~/types/pagination'
import type { OrderingQuery } from '~/types/ordering'

const ZodRegionTranslations = z.record(
	z.object({
		name: z.string().nullish()
	})
)

export const ZodRegion = z.object({
	translations: ZodRegionTranslations,
	alpha: z.string().min(3),
	alpha2: z.string().min(2),
	createdAt: z.string().datetime({ offset: true }),
	updatedAt: z.string().datetime({ offset: true }),
	sortOrder: z.number().nullish(),
	uuid: z.string().uuid()
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
