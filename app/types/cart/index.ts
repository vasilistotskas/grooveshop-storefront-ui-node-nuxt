import { object, number, array, lazy } from 'zod'

import { ZodCartItem } from '~/types/cart/item'
import { ZodTimeStampModel, ZodUUIDModel } from '~/types'

export const ZodCart = object({
  id: number(),
  user: number().nullish(),
  totalPrice: number(),
  totalDiscountValue: number(),
  totalVatValue: number(),
  totalItems: number(),
  totalItemsUnique: number(),
  cartItems: array(lazy(() => ZodCartItem)),
})
  .merge(ZodUUIDModel)
  .merge(ZodTimeStampModel)

export type Cart = typeof ZodCart._type
