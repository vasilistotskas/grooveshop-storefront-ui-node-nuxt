import { z } from 'zod'

import { ZodCartItem } from '~/types/cart/item'

export const ZodCart = z.object({
  id: z.number(),
  user: z.number().nullish(),
  totalPrice: z.number(),
  totalDiscountValue: z.number(),
  totalVatValue: z.number(),
  totalItems: z.number(),
  totalItemsUnique: z.number(),
  cartItems: z.array(z.lazy(() => ZodCartItem)),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  uuid: z.string().uuid(),
})

export type Index = Readonly<z.infer<typeof ZodCart>>
