import { z } from 'zod'

import { ZodCartItem } from '~/types/cart/item'
import { ZodTimeStampModel, ZodUUIDModel } from '~/types'

export const ZodCart = z.object({
  id: z.number(),
  user: z.number().nullish(),
  totalPrice: z.number(),
  totalDiscountValue: z.number(),
  totalVatValue: z.number(),
  totalItems: z.number(),
  totalItemsUnique: z.number(),
  cartItems: z.array(z.lazy(() => ZodCartItem)),
}).merge(ZodUUIDModel).merge(ZodTimeStampModel)

export type Cart = z.infer<typeof ZodCart>
