import { z } from 'zod'
import { PaginationQuery } from '~/zod/pagination/pagination'
import { OrderingQuery } from '~/zod/ordering/ordering'
import { ZodProduct } from '~/zod/product/product'
import { ZodAccount } from '~/zod/user/account'

export const ZodFavourite = z.object({
	id: z.number(),
	product: z.union([z.number(), ZodProduct]),
	user: z.union([z.number(), ZodAccount]),
	createdAt: z.string().datetime({ offset: true }),
	updatedAt: z.string().datetime({ offset: true }),
	uuid: z.string()
})

export const ZodFavouriteQuery = z.object({
	page: z.string().nullish(),
	ordering: z.string().nullish(),
	id: z.string().nullish(),
	userId: z.string().nullish(),
	productId: z.string().nullish(),
	expand: z.string().nullish()
})

export const ZodFavouriteCreateRequest = z.object({
	user: z.string(),
	product: z.string()
})

export const ZodFavouriteParams = z.object({
	id: z.string()
})

export type Favourite = z.infer<typeof ZodFavourite>
export type FavouriteParams = z.infer<typeof ZodFavouriteParams>
export type FavouriteCreateRequest = z.infer<typeof ZodFavouriteCreateRequest>
export type FavouriteOrderingField = 'createdAt'
export type FavouriteQuery = PaginationQuery &
	OrderingQuery & {
		id?: string | undefined
		userId?: string | undefined
		productId?: string | undefined
		expand?: string | undefined
	}
