import { z } from 'zod'

import { ZodProduct } from '~/types/product'
import { ZodSortableModel, ZodTimeStampModel, ZodUUIDModel } from '~/types'

export const ZodOrderItem = z.object({
  id: z.number(),
  price: z.number().nullish(),
  product: ZodProduct,
  quantity: z.number(),
  totalPrice: z.number().nullish(),
}).merge(ZodUUIDModel).merge(ZodTimeStampModel).merge(ZodSortableModel)

export const ZodOrderCreateItem = z.object({
  id: z.number(),
  cart: z.number(),
  product: z.number(),
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
}).merge(ZodUUIDModel).merge(ZodTimeStampModel)

export const ZodOrderCreateResponseItem = z.object({
  id: z.number(),
  product: z.number(),
  quantity: z.number(),
})

export type OrderItem = z.infer<typeof ZodOrderItem>
