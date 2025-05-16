import * as z from 'zod'

// Order item schema
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

// Order item for creation
export const ZodOrderCreateItem = z.object({
  productId: z.number(),
  quantity: z.number(),
  price: z.number(),
  vatPercent: z.number().optional(),
  vatValue: z.number().optional(),
  discountPercent: z.number().optional(),
  discountValue: z.number().optional(),
  totalPrice: z.number(),
  notes: z.string().optional(),
})

// Order item response after creation
export const ZodOrderCreateResponseItem = z.object({
  id: z.number(),
  productId: z.number(),
  quantity: z.number(),
  price: z.number(),
  totalPrice: z.number(),
})

// Refund request schema
export const ZodOrderItemRefundRequest = z.object({
  reason: z.string().optional(),
  amount: z.number().optional(),
  quantity: z.number().optional(),
})
