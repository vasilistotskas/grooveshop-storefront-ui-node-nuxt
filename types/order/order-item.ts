import { z } from 'zod'

import { ZodProduct } from '~/types/product/product'

export const ZodOrderItem = z.object({
	id: z.number(),
	price: z.number().nullish(),
	product: ZodProduct,
	quantity: z.number(),
	createdAt: z.string().datetime({ offset: true }),
	updatedAt: z.string().datetime({ offset: true }),
	uuid: z.string().uuid(),
	sortOrder: z.number().nullish(),
	totalPrice: z.number().nullish()
})

export const ZodOrderCreateItem = z.object({
	id: z.number(),
	cart: z.number(),
	product: z.number(),
	quantity: z.number(),
	price: z.number().nullish(),
	finalPrice: z.number().nullish(),
	discountValue: z.number().nullish(),
	priceSavePercent: z.number().nullish(),
	discountPercent: z.number().nullish(),
	vatPercent: z.number().nullish(),
	vatValue: z.number().nullish(),
	totalPrice: z.number().nullish(),
	totalDiscountValue: z.number().nullish(),
	createdAt: z.string().datetime({ offset: true }),
	updatedAt: z.string().datetime({ offset: true }),
	uuid: z.string().uuid()
})

export const ZodOrderCreateResponseItem = z.object({
	id: z.number(),
	product: z.number(),
	quantity: z.number()
})

export type OrderItem = z.infer<typeof ZodOrderItem>
export type OrderCreateItem = z.infer<typeof ZodOrderCreateItem>
export type OrderResponseCreateItem = z.infer<typeof ZodOrderCreateResponseItem>
