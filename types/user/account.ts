import { z } from 'zod'
import type { Favourite } from '~/types/product/favourite'
import type { Review } from '~/types/product/review'
import type { Order } from '~/types/order/order'
import type { Address } from '~/types/user/address'

export const ZodAccount = z.object({
	id: z.number(),
	email: z.string(),
	image: z.string().nullish(),
	firstName: z.string().nullish(),
	lastName: z.string().nullish(),
	phone: z.string().nullish(),
	city: z.string().nullish(),
	zipcode: z.string().nullish(),
	address: z.string().nullish(),
	place: z.string().nullish(),
	country: z.string().nullish(),
	region: z.string().nullish(),
	isActive: z.boolean(),
	isStaff: z.boolean(),
	birthDate: z.string().nullish(),
	twitter: z.string().nullish(),
	linkedin: z.string().nullish(),
	facebook: z.string().nullish(),
	instagram: z.string().nullish(),
	website: z.string().nullish(),
	youtube: z.string().nullish(),
	github: z.string().nullish(),
	bio: z.string().nullish(),
	mainImageAbsoluteUrl: z.string().nullish(),
	mainImageFilename: z.string().nullish(),
	isSuperuser: z.boolean(),
	lastLogin: z.string().nullish(),
	createdAt: z.string().datetime({ offset: true }),
	updatedAt: z.string().datetime({ offset: true }),
	uuid: z.string().uuid()
})

export const ZodAccountParams = z.object({
	id: z.string()
})

export const ZodAccountPatchBody = z.object({
	email: z.string().nullish(),
	image: z.string().nullish(),
	firstName: z.string().nullish(),
	lastName: z.string().nullish(),
	phone: z.string().nullish(),
	city: z.string().nullish(),
	zipcode: z.string().nullish(),
	address: z.string().nullish(),
	place: z.string().nullish(),
	country: z.string().nullish(),
	region: z.string().nullish(),
	isActive: z.boolean().nullish(),
	isStaff: z.boolean().nullish(),
	birthDate: z.string().nullish()
})

export const ZodAccountPutBody = z.object({
	email: z.string(),
	image: z.string().nullish(),
	firstName: z.string().nullish(),
	lastName: z.string().nullish(),
	phone: z.string().nullish(),
	city: z.string().nullish(),
	zipcode: z.string().nullish(),
	address: z.string().nullish(),
	place: z.string().nullish(),
	country: z.string().nullish(),
	region: z.string().nullish(),
	isActive: z.boolean().nullish(),
	isStaff: z.boolean().nullish(),
	birthDate: z.string().nullish()
})

export type Account = z.infer<typeof ZodAccount>
export type AccountPutBody = z.infer<typeof ZodAccountPutBody>
export type AccountParams = z.infer<typeof ZodAccountParams>
export type AccountPatchBody = z.infer<typeof ZodAccountPatchBody>

export type UserAccountSession = {
	account: Account | null
	favourites: Favourite[] | null
	reviews: Review[] | null
	orders: Order[] | null
	addresses: Address[] | null
}
