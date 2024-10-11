import { object, number } from 'zod'

import { ZodProduct } from '~/types/product'
import { ZodSortableModel, ZodTimeStampModel, ZodUUIDModel } from '~/types'

export const ZodOrderItem = object({
  id: number(),
  price: number().nullish(),
  product: ZodProduct,
  quantity: number(),
  totalPrice: number().nullish(),
})
  .merge(ZodUUIDModel)
  .merge(ZodTimeStampModel)
  .merge(ZodSortableModel)

export const ZodOrderCreateItem = object({
  id: number(),
  cart: number(),
  product: number(),
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

export const ZodOrderCreateResponseItem = object({
  id: number(),
  product: number(),
  quantity: number(),
})

export type OrderItem = typeof ZodOrderItem._type
