import { z } from 'zod'
import type { PaginationQuery } from '~/types/pagination'
import type { OrderingQuery } from '~/types/ordering'

const ZodBlogTagTranslations = z.record(
	z.object({
		name: z.string().nullish()
	})
)

export const ZodBlogTag = z.object({
	translations: ZodBlogTagTranslations,
	id: z.number().int(),
	active: z.boolean(),
	createdAt: z.string().datetime({ offset: true }),
	updatedAt: z.string().datetime({ offset: true }),
	sortOrder: z.number().nullish(),
	uuid: z.string().uuid()
})

export const ZodBlogTagQuery = z.object({
	page: z.string().nullish(),
	ordering: z.string().nullish(),
	id: z.string().nullish(),
	active: z.string().nullish(),
	pagination: z.string().nullish()
})

export const ZodBlogTagParams = z.object({
	id: z.string()
})

export type BlogTag = z.infer<typeof ZodBlogTag>
export type BlogTagQuery = PaginationQuery &
	OrderingQuery & {
		id?: string | undefined
		active?: string | undefined
	}
export type BlogTagParams = z.infer<typeof ZodBlogTagParams>
