import { z } from 'zod'
import { PaginationQuery } from '~/zod/pagination/pagination'
import { OrderingQuery } from '~/zod/ordering/ordering'
import { FloorChoicesEnum, LocationChoicesEnum } from '~/zod/global/general'

export const ZodAddress = z.object({
	id: z.number(),
	createdAt: z.string().datetime({ offset: true }),
	updatedAt: z.string().datetime({ offset: true }),
	uuid: z.string().uuid(),
	title: z.string().min(3),
	firstName: z.string().min(3),
	lastName: z.string().min(3),
	street: z.string().min(3),
	streetNumber: z.string().min(1),
	city: z.string().min(3),
	zipcode: z.string().min(3),
	floor: z.nativeEnum(FloorChoicesEnum).nullish(),
	locationType: z.nativeEnum(LocationChoicesEnum).nullish(),
	phone: z.string().nullish(),
	mobilePhone: z.string().nullish(),
	notes: z.string().nullish(),
	isMain: z.boolean().nullish(),
	user: z.number().nullish(),
	country: z.string().min(2).nullish(),
	region: z.string().min(3).nullish()
})

export const ZodAddressQuery = z.object({
	page: z.string().nullish(),
	ordering: z.string().nullish(),
	id: z.string().nullish(),
	userId: z.string().nullish(),
	expand: z.string().nullish()
})

export const ZodAddressCreateRequest = z.object({
	title: z.string().min(3),
	firstName: z.string().min(3),
	lastName: z.string().min(3),
	street: z.string().min(3),
	streetNumber: z.string().min(1),
	city: z.string().min(3),
	zipcode: z.string().min(3),
	floor: z.nativeEnum(FloorChoicesEnum).nullish(),
	locationType: z.nativeEnum(LocationChoicesEnum).nullish(),
	phone: z.string().nullish(),
	mobilePhone: z.string().nullish(),
	notes: z.string().nullish(),
	isMain: z.boolean().nullish(),
	user: z.number().nullish(),
	country: z.string().min(2).nullish(),
	region: z.string().min(3).nullish()
})

export const ZodAddressParams = z.object({
	id: z.string()
})

export const ZodAddressPutRequest = z.object({
	title: z.string().min(3),
	firstName: z.string().min(3),
	lastName: z.string().min(3),
	street: z.string().min(3),
	streetNumber: z.string().min(1),
	city: z.string().min(3),
	zipcode: z.string().min(3),
	floor: z.nativeEnum(FloorChoicesEnum).nullish(),
	locationType: z.nativeEnum(LocationChoicesEnum).nullish(),
	phone: z.string().nullish(),
	mobilePhone: z.string().nullish(),
	notes: z.string().nullish(),
	isMain: z.boolean().nullish(),
	user: z.number().nullish(),
	country: z.string().min(2).nullish(),
	region: z.string().min(3).nullish()
})

export type Address = z.infer<typeof ZodAddress>
export type AddressParams = z.infer<typeof ZodAddressParams>
export type AddressPutRequest = z.infer<typeof ZodAddressPutRequest>
export type AddressCreateRequest = z.infer<typeof ZodAddressCreateRequest>
export type AddressQuery = PaginationQuery &
	OrderingQuery & {
		id?: string | undefined
		userId?: string | undefined
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
