import * as z from 'zod'

export const ZodCart = z.object({
  id: z.number(),
  user: z.number().nullish(),
  sessionKey: z.string().nullish(),
  totalPrice: z.number(),
  totalDiscountValue: z.number(),
  totalVatValue: z.number(),
  totalItems: z.number(),
  totalItemsUnique: z.number(),
  cartItems: z.array(z.lazy(() => ZodCartItem)),
}).merge(ZodUUIDModel).merge(ZodTimeStampModel)
