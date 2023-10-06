import { z } from 'zod'
import { PaginationQuery } from '~/types/pagination/pagination'
import { OrderingQuery } from '~/types/ordering/ordering'
import { FloorChoicesEnum, LocationChoicesEnum } from '~/types/global/general'

export const ZodAddress = z.object({
	id: z.number(),
	createdAt: z.string().datetime({ offset: true }),
	updatedAt: z.string().datetime({ offset: true }),
	uuid: z.string().uuid(),
	title: z.string(),
	firstName: z.string(),
	lastName: z.string(),
	street: z.string(),
	streetNumber: z.string(),
	city: z.string(),
	zipcode: z.string(),
	floor: z.nativeEnum(FloorChoicesEnum).nullish(),
	locationType: z.nativeEnum(LocationChoicesEnum).nullish(),
	phone: z.string().nullish(),
	mobilePhone: z.string().nullish(),
	notes: z.string().nullish(),
	isMain: z.boolean().nullish(),
	user: z.number().nullish(),
	country: z.string().nullish(),
	region: z.string().nullish()
})

export const ZodAddressQuery = z.object({
	page: z.string().nullish(),
	ordering: z.string().nullish(),
	id: z.string().nullish(),
	user: z.string().nullish(),
	expand: z.string().nullish()
})

export const ZodAddressCreateBody = z.object({
	title: z.string(),
	firstName: z.string(),
	lastName: z.string(),
	street: z.string(),
	streetNumber: z.string(),
	city: z.string(),
	zipcode: z.string(),
	floor: z.nativeEnum(FloorChoicesEnum).nullish(),
	locationType: z.nativeEnum(LocationChoicesEnum).nullish(),
	phone: z.string().nullish(),
	mobilePhone: z.string().nullish(),
	notes: z.string().nullish(),
	isMain: z.boolean().nullish(),
	user: z.number().nullish(),
	country: z.string().nullish(),
	region: z.string().nullish()
})

export const ZodAddressParams = z.object({
	id: z.string()
})

export const ZodAddressPutBody = z.object({
	title: z.string(),
	firstName: z.string(),
	lastName: z.string(),
	street: z.string(),
	streetNumber: z.string(),
	city: z.string(),
	zipcode: z.string(),
	floor: z.nativeEnum(FloorChoicesEnum).nullish(),
	locationType: z.nativeEnum(LocationChoicesEnum).nullish(),
	phone: z.string().nullish(),
	mobilePhone: z.string().nullish(),
	notes: z.string().nullish(),
	isMain: z.boolean().nullish(),
	user: z.number().nullish(),
	country: z.string().nullish(),
	region: z.string().nullish()
})

export type Address = z.infer<typeof ZodAddress>
export type AddressParams = z.infer<typeof ZodAddressParams>
export type AddressPutBody = z.infer<typeof ZodAddressPutBody>
export type AddressCreateBody = z.infer<typeof ZodAddressCreateBody>
export type AddressQuery = PaginationQuery &
	OrderingQuery & {
		id?: string | undefined
		user?: string | undefined
		expand?: string | undefined
	}
export type AddressOrderingField =
	| 'id'
	| 'user'
	| 'country'
	| 'zipcode'
	| 'floor'
	| 'locationType'
	| 'isMain'
	| 'createdAt'
	| 'updatedAt'
