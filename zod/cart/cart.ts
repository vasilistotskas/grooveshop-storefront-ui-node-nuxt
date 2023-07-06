import { z } from 'zod'
import { ZodCartItem } from '~/zod/cart/cart-item'

export const ZodCart = z.object({
	id: z.number(),
	user: z.number().nullish(),
	totalPrice: z.number(),
	totalDiscountValue: z.number(),
	totalVatValue: z.number(),
	totalItems: z.number(),
	totalItemsUnique: z.number(),
	cartItems: z.array(ZodCartItem)
})

export type Cart = Readonly<z.infer<typeof ZodCart>>
