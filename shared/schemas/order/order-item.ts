import * as z from 'zod'

export const ZodOrderItem = z.object({
  id: z.number(),
  price: z.number(),
  product: z.lazy(() => ZodProduct),
  quantity: z.number(),
  originalQuantity: z.number().nullish(),
  isRefunded: z.boolean().default(false),
  refundedQuantity: z.number(),
  netQuantity: z.number(),
  totalPrice: z.number(),
  refundedAmount: z.number(),
  netPrice: z.number(),
  notes: z.string().optional(),
}).merge(ZodUUIDModel).merge(ZodTimeStampModel).merge(ZodSortableModel)

export const ZodOrderCreateItem = z.object({
  product: z.number(),
  quantity: z.number(),
  notes: z.string().optional(),
})

export const ZodOrderItemRefundRequest = z.object({
  reason: z.string().optional(),
  amount: z.number().optional(),
  quantity: z.number().optional(),
})
