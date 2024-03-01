import { z } from 'zod'

import { ZodBlogComment } from '~/types/blog/comment'
import { ZodOrder } from '~/types/order/order'
import { ZodProductFavourite } from '~/types/product/favourite'
import { ZodProductReview } from '~/types/product/review'
import { ZodUserAddress } from '~/types/user/address'

export const ZodUserAccountDetails = z.object({
	favouriteProducts: z.array(z.lazy(() => ZodProductFavourite)).nullish(),
	orders: z.array(z.lazy(() => ZodOrder)).nullish(),
	productReviews: z.array(z.lazy(() => ZodProductReview)).nullish(),
	userAddresses: z.array(z.lazy(() => ZodUserAddress)).nullish(),
	blogComments: z.array(z.lazy(() => ZodBlogComment)).nullish()
})

export const ZodUserAccountDetailsQuery = z.object({
	expand: z.union([z.literal('true'), z.literal('false')]).nullish()
})

export const ZodUserAccountDetailsParams = z.object({
	id: z.string()
})

export type UserAccountDetails = z.infer<typeof ZodUserAccountDetails>
export type UserAccountDetailsParams = z.infer<typeof ZodUserAccountDetailsParams>
export type UserAccountDetailsQuery = z.infer<typeof ZodUserAccountDetailsQuery>
