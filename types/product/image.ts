import { z } from 'zod'
import { PaginationQuery } from '~/types/pagination/pagination'
import { OrderingQuery } from '~/types/ordering/ordering'

const ZodImageTranslations = z.record(
	z.object({
		title: z.string().nullish()
	})
)

export const ZodImage = z.object({
	id: z.number(),
	translations: ZodImageTranslations,
	product: z.number(),
	image: z.string(),
	thumbnail: z.string().nullish(),
	isMain: z.boolean(),
	mainImageAbsoluteUrl: z.string(),
	mainImageFilename: z.string(),
	createdAt: z.string().datetime({ offset: true }),
	updatedAt: z.string().datetime({ offset: true }),
	uuid: z.string(),
	sortOrder: z.number()
})

export const ZodImageQuery = z.object({
	id: z.string().nullish(),
	product: z.string().nullish(),
	isMain: z.string().nullish()
})

export type Image = z.infer<typeof ZodImage>
export type ImageQuery = PaginationQuery &
	OrderingQuery & {
		id?: string | undefined
		product?: string | undefined
		isMain?: string | undefined
	}
