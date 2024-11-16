import * as z from 'zod'

export const ZodCartItem = z.object({
  id: z.number(),
  cart: z.number(),
  product: ZodProduct,
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

export const ZodCartItemAddBody = z.object({
  product: z.lazy(() => ZodProduct),
  quantity: z.number(),
})

export const ZodCartItemCreateResponse = z.object({
  id: z.number(),
  cart: z.number(),
  product: z.number(),
  quantity: z.number(),
})

export const ZodCartItemCreateBody = z.object({
  product: z.string(),
  quantity: z.string(),
})

export const ZodCartItemPutBody = z.object({
  quantity: z.string(),
})

export const ZodCartItemParams = z.object({
  id: z.string(),
})
