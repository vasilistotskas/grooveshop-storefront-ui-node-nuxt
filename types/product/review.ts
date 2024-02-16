import { z } from 'zod'
import type { PaginationQuery } from '~/types/pagination'
import type { OrderingQuery } from '~/types/ordering'
import { ZodProduct } from '~/types/product/product'
import { ZodUserAccount } from '~/types/user/account'

export const ZodProductReviewStatusEnum = z.enum(['NEW', 'TRUE', 'FALSE'])

const ZodProductReviewTranslations = z.record(
	z.object({
		comment: z.string().nullish()
	})
)

export const ZodProductReview = z.object({
	translations: ZodProductReviewTranslations,
	id: z.number(),
	product: z.union([z.number(), ZodProduct]),
	user: z.union([z.number(), ZodUserAccount]),
	rate: z.number(),
	status: ZodProductReviewStatusEnum,
	createdAt: z.string().datetime({ offset: true }),
	updatedAt: z.string().datetime({ offset: true }),
	publishedAt: z.string().datetime({ offset: true }).nullish(),
	isPublished: z.boolean(),
	uuid: z.string().uuid()
})

export const ZodProductReviewQuery = z.object({
	page: z.string().nullish(),
	ordering: z.string().nullish(),
	id: z.string().nullish(),
	productId: z.string().nullish(),
	userId: z.string().nullish(),
	expand: z.string().nullish(),
	status: ZodProductReviewStatusEnum.optional()
})

export const ZodProductReviewCreateBody = z.object({
	product: z.string(),
	user: z.string(),
	translations: ZodProductReviewTranslations,
	rate: z.string(),
	status: z.string()
})

export const ZodProductReviewCreateQuery = z.object({
	expand: z.string().nullish()
})

export const ZodProductReviewPutBody = z.object({
	product: z.string(),
	user: z.string(),
	translations: ZodProductReviewTranslations,
	rate: z.string()
})

export const ZodReviewParams = z.object({
	id: z.string()
})

export const ZodReviewUserHadReviewedBody = z.object({
	product: z.string(),
	user: z.string()
})

export type ProductReview = z.infer<typeof ZodProductReview>
export type ProductReviewParams = z.infer<typeof ZodReviewParams>
export type ProductReviewUserHadReviewedBody = z.infer<
	typeof ZodReviewUserHadReviewedBody
>
export type ProductReviewCreateBody = z.infer<typeof ZodProductReviewCreateBody>
export type ProductReviewCreateQuery = z.infer<typeof ZodProductReviewCreateQuery>
export type ProductReviewPutBody = z.infer<typeof ZodProductReviewPutBody>
export type ProductReviewOrderingField = 'id' | 'userId' | 'productId' | 'createdAt'
export type ProductReviewQuery = PaginationQuery &
	OrderingQuery & {
		id?: string | undefined
		productId?: string | undefined
		userId?: string | undefined
		expand?: string | undefined
		status?: 'NEW' | 'TRUE' | 'FALSE' | undefined
	}
