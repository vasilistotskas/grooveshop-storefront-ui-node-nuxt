import { z } from 'zod'
import { ZodProduct } from '~/types/product/product'

export const ZodOrderItem = z.object({
	price: z.number(),
	product: ZodProduct,
	quantity: z.number(),
	createdAt: z.string().datetime({ offset: true }),
	updatedAt: z.string().datetime({ offset: true }),
	uuid: z.string(),
	sortOrder: z.number().nullish(),
	totalPrice: z.number()
})

export type OrderItem = z.infer<typeof ZodOrderItem>
