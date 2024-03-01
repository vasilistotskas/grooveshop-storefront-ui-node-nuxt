import { z } from 'zod'

import type { OrderingQuery } from '~/types/ordering'
import type { PaginationQuery } from '~/types/pagination'
import { ZodProduct } from '~/types/product/product'
import { ZodUserAccount } from '~/types/user/account'

export const ZodProductFavourite = z.object({
	id: z.number(),
	product: z.union([z.number(), z.lazy(() => ZodProduct)]),
	user: z.union([z.number(), z.lazy(() => ZodUserAccount)]),
	createdAt: z.string().datetime({ offset: true }),
	updatedAt: z.string().datetime({ offset: true }),
	uuid: z.string().uuid()
})

export const ZodProductFavouriteQuery = z.object({
	page: z.string().nullish(),
	ordering: z.string().nullish(),
	id: z.string().nullish(),
	userId: z.string().nullish(),
	productId: z.string().nullish(),
	expand: z.union([z.literal('true'), z.literal('false')]).nullish()
})

export const ZodProductFavouriteCreateBody = z.object({
	user: z.string(),
	product: z.string()
})

export const ZodProductFavouriteParams = z.object({
	id: z.string()
})

export type ProductFavourite = z.infer<typeof ZodProductFavourite>
export type ProductFavouriteParams = z.infer<typeof ZodProductFavouriteParams>
export type ProductFavouriteCreateBody = z.infer<typeof ZodProductFavouriteCreateBody>
export type ProductFavouriteOrderingField = 'createdAt'
export type ProductFavouriteQuery = PaginationQuery &
	OrderingQuery & {
		id?: string | undefined
		userId?: string | undefined
		productId?: string | undefined
		expand?: string | undefined
	}
