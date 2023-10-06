import { z } from 'zod'
import { ZodOrderItem } from '~/types/order/order-item'
import { PaginationQuery } from '~/types/pagination/pagination'
import { OrderingQuery } from '~/types/ordering/ordering'
import { ZodCountry } from '~/types/country/country'
import { ZodRegion } from '~/types/region/region'
import { FloorChoicesEnum, LocationChoicesEnum } from '~/types/global/general'
import { ZodPayWay } from '~/types/pay-way/pay-way'

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
	firstName: z.string(),
	lastName: z.string(),
	email: z.string(),
	address: z.string(),
	zipcode: z.string(),
	place: z.string().nullish(),
	city: z.string(),
	phone: z.string(),
	customerNotes: z.string().nullish(),
	orderItemOrder: z.array(ZodOrderItem)
})

export const ZodOrderParams = z.object({
	id: z.number()
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
