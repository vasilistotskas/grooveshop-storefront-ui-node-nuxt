import { z } from 'zod'
import type { PaginationQuery } from '~/types/pagination'
import type { OrderingQuery } from '~/types/ordering'
import { ZodProduct } from '~/types/product/product'
import { ZodAccount } from '~/types/user/account'

export const StatusEnum = z.enum(['NEW', 'TRUE', 'FALSE'])

const ZodReviewTranslations = z.record(
	z.object({
		comment: z.string().nullish()
	})
)

export const ZodReview = z.object({
	translations: ZodReviewTranslations,
	id: z.number(),
	product: z.union([z.number(), ZodProduct]),
	user: z.union([z.number(), ZodAccount]),
	rate: z.number(),
	status: StatusEnum,
	createdAt: z.string().datetime({ offset: true }),
	updatedAt: z.string().datetime({ offset: true }),
	publishedAt: z.string().datetime({ offset: true }).nullish(),
	isPublished: z.boolean(),
	uuid: z.string().uuid()
})

export const ZodReviewQuery = z.object({
	page: z.string().nullish(),
	ordering: z.string().nullish(),
	id: z.string().nullish(),
	productId: z.string().nullish(),
	userId: z.string().nullish(),
	expand: z.string().nullish()
})

export const ZodReviewCreateBody = z.object({
	product: z.string(),
	user: z.string(),
	translations: ZodReviewTranslations,
	rate: z.string(),
	status: z.string()
})

export const ZodReviewCreateQuery = z.object({
	expand: z.string().nullish()
})

export const ZodReviewPutBody = z.object({
	product: z.string(),
	user: z.string(),
	translations: ZodReviewTranslations,
	rate: z.string()
})

export const ZodReviewParams = z.object({
	id: z.string()
})

export const ZodReviewUserHadReviewedBody = z.object({
	product: z.string(),
	user: z.string()
})

export type Review = z.infer<typeof ZodReview>
export type ReviewParams = z.infer<typeof ZodReviewParams>
export type ReviewUserHadReviewedBody = z.infer<typeof ZodReviewUserHadReviewedBody>
export type ReviewCreateBody = z.infer<typeof ZodReviewCreateBody>
export type ReviewCreateQuery = z.infer<typeof ZodReviewCreateQuery>
export type ReviewPutBody = z.infer<typeof ZodReviewPutBody>
export type ReviewOrderingField = 'id' | 'userId' | 'productId' | 'createdAt'
export type ReviewQuery = PaginationQuery &
	OrderingQuery & {
		id?: string | undefined
		productId?: string | undefined
		userId?: string | undefined
		expand?: string | undefined
	}
export type ReviewActionPayload = {
	id: number
	comment: string
	productId: number
	rate: number
	userId: number
}
