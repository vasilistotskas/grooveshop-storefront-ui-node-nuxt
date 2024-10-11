import { object, string, number, lazy } from 'zod'

import { ZodProduct } from '~/types/product'
import { ZodTimeStampModel, ZodUUIDModel } from '~/types'

export const ZodCartItem = object({
  id: number(),
  cart: number(),
  product: ZodProduct,
  quantity: number(),
  price: number().nullish(),
  finalPrice: number().nullish(),
  discountValue: number().nullish(),
  priceSavePercent: number().nullish(),
  discountPercent: number().nullish(),
  vatPercent: number().nullish(),
  vatValue: number().nullish(),
  totalPrice: number().nullish(),
  totalDiscountValue: number().nullish(),
})
  .merge(ZodUUIDModel)
  .merge(ZodTimeStampModel)

export const ZodCartItemAddBody = object({
  product: lazy(() => ZodProduct),
  quantity: number(),
})

export const ZodCartItemCreateResponse = object({
  id: number(),
  cart: number(),
  product: number(),
  quantity: number(),
})

export const ZodCartItemCreateBody = object({
  product: string(),
  quantity: string(),
})

export const ZodCartItemPutBody = object({
  quantity: string(),
})

export const ZodCartItemParams = object({
  id: string(),
})

export type Item = typeof ZodCartItem._type
export type CartItemAddBody = typeof ZodCartItemAddBody._type
export type CartItemCreateBody = typeof ZodCartItemCreateBody._type
export type CartItemPutBody = typeof ZodCartItemPutBody._type
