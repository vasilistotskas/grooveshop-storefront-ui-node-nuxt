import { z } from 'zod'
import {
	ZodOrderCreateItem,
	ZodOrderItem,
	ZodOrderCreateResponseItem
} from '~/types/order/order-item'
import type { PaginationQuery } from '~/types/pagination'
import type { OrderingQuery } from '~/types/ordering'
import { ZodCountry } from '~/types/country'
import { ZodRegion } from '~/types/region'
import {
	FloorChoicesEnum,
	LocationChoicesEnum,
	ZodFloorChoicesEnum,
	ZodLocationChoicesEnum
} from '~/types/global/general'
import { ZodPayWay } from '~/types/pay-way'

export const StatusEnum = z.enum(['SENT', 'PAID_AND_SENT', 'CANCELED', 'PENDING'])
export const documentTypeEnum = z.enum(['RECEIPT', 'INVOICE'])

export const ZodOrder = z.object({
	id: z.number(),
	user: z.number().nullish(),
	payWay: ZodPayWay,
	country: ZodCountry,
	region: ZodRegion,
	floor: z.nativeEnum(FloorChoicesEnum).nullish(),
	locationType: z.nativeEnum(LocationChoicesEnum).nullish(),
	email: z.string(),
	firstName: z.string(),
	lastName: z.string(),
	street: z.string(),
	streetNumber: z.string(),
	zipcode: z.string(),
	place: z.string().nullish(),
	city: z.string(),
	phone: z.string(),
	mobilePhone: z.string().nullish(),
	status: StatusEnum,
	customerNotes: z.string().nullish(),
	shippingPrice: z.number(),
	paidAmount: z.number(),
	documentType: documentTypeEnum,
	orderItemOrder: z.array(ZodOrderItem),
	createdAt: z.string().datetime({ offset: true }),
	updatedAt: z.string().datetime({ offset: true }),
	uuid: z.string(),
	totalPriceItems: z.number(),
	totalPriceExtra: z.number(),
	fullAddress: z.string()
})

export const ZodOrderQuery = z.object({
	page: z.string().nullish(),
	ordering: z.string().nullish(),
	userId: z.string().nullish(),
	status: z.string().nullish()
})

export const ZodOrderCreateBody = z.object({
	user: z.string().nullish(),
	country: z.string(),
	region: z.string(),
	floor: z.union([ZodFloorChoicesEnum, z.string()]).nullish(),
	locationType: z.union([ZodLocationChoicesEnum, z.string()]).nullish(),
	street: z.string(),
	streetNumber: z.string(),
	payWay: z.number(),
	status: StatusEnum.nullish(),
	firstName: z.string(),
	lastName: z.string(),
	email: z.string().email(),
	zipcode: z.string(),
	place: z.string().nullish(),
	city: z.string(),
	phone: z.string(),
	mobilePhone: z.string().nullish(),
	customerNotes: z.string().nullish(),
	shippingPrice: z.number(),
	documentType: documentTypeEnum,
	orderItemOrder: z.array(ZodOrderCreateItem)
})

export const ZodOrderCreateResponse = z.object({
	id: z.number(),
	user: z.string().nullish(),
	country: z.string(),
	region: z.string(),
	floor: z.union([ZodFloorChoicesEnum, z.string()]).nullish(),
	locationType: z.union([ZodLocationChoicesEnum, z.string()]).nullish(),
	street: z.string(),
	streetNumber: z.string(),
	payWay: z.number(),
	status: StatusEnum.nullish(),
	firstName: z.string(),
	lastName: z.string(),
	email: z.string().email(),
	zipcode: z.string(),
	place: z.string().nullish(),
	city: z.string(),
	phone: z.string(),
	mobilePhone: z.string().nullish(),
	customerNotes: z.string().nullish(),
	orderItemOrder: z.array(ZodOrderCreateResponseItem),
	shippingPrice: z.number(),
	documentType: documentTypeEnum,
	createdAt: z.string().datetime({ offset: true }),
	updatedAt: z.string().datetime({ offset: true }),
	uuid: z.string().uuid(),
	totalPriceItems: z.number(),
	totalPriceExtra: z.number(),
	fullAddress: z.string()
})

export const ZodOrderParams = z.object({
	id: z.string()
})

export const ZodOrderUUIDParams = z.object({
	uuid: z.string()
})

export type Order = z.infer<typeof ZodOrder>
export type OrderCreateBody = z.infer<typeof ZodOrderCreateBody>
export type OrderParams = z.infer<typeof ZodOrderParams>
export type OrderOrderingField = 'createdAt'
export type OrderQuery = PaginationQuery &
	OrderingQuery & {
		userId?: string | undefined
		status?: string | undefined
	}
