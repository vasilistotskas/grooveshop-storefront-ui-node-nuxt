import { z } from 'zod'
import { ZodProduct } from '~/types/product/product'

export const ZodCartItem = z.object({
	id: z.number(),
	cart: z.number(),
	product: ZodProduct,
	quantity: z.number(),
	totalPrice: z.number().nullish(),
	totalDiscountValue: z.number().nullish(),
	productDiscountPercent: z.number().nullish()
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
export type CartItemCreateBody = z.infer<typeof ZodCartItemCreateBody>
export type CartItemPutBody = z.infer<typeof ZodCartItemPutBody>
export type CartItemCreateResponse = z.infer<typeof ZodCartItemCreateResponse>
export type CartItemParams = z.infer<typeof ZodCartItemParams>
