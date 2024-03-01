import { z } from 'zod'

import type { OrderingQuery } from '~/types/ordering'
import type { PaginationQuery } from '~/types/pagination'

const ZodProductImageTranslations = z.record(
	z.object({
		title: z.string().nullish()
	})
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
	sortOrder: z.number().nullish()
})

export const ZodProductImageQuery = z.object({
	id: z.string().nullish(),
	product: z.string().nullish(),
	isMain: z.string().nullish()
})

export type ProductImage = z.infer<typeof ZodProductImage>
export type ProductImageQuery = PaginationQuery &
	OrderingQuery & {
		id?: string | undefined
		product?: string | undefined
		isMain?: string | undefined
	}
