import { z } from 'zod'
import { ZodProduct } from '~/types/product/product'

export const ZodCartItem = z.object({
	id: z.number(),
	cart: z.number(),
	product: ZodProduct,
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

export const ZodCartItemAddBody = z.object({
	product: ZodProduct,
	quantity: z.number()
})

export const ZodCartItemCreateResponse = z.object({
	id: z.number(),
	cart: z.number(),
	product: z.number(),
	quantity: z.number()
})

export const ZodCartItemCreateBody = z.object({
	product: z.string(),
	quantity: z.string()
})

export const ZodCartItemPutBody = z.object({
	quantity: z.string()
})

export const ZodCartItemParams = z.object({
	id: z.string()
})

export type CartItem = Readonly<z.infer<typeof ZodCartItem>>
export type CartItemAddBody = z.infer<typeof ZodCartItemAddBody>
export type CartItemCreateBody = z.infer<typeof ZodCartItemCreateBody>
export type CartItemPutBody = z.infer<typeof ZodCartItemPutBody>
export type CartItemCreateResponse = z.infer<typeof ZodCartItemCreateResponse>
export type CartItemParams = z.infer<typeof ZodCartItemParams>
