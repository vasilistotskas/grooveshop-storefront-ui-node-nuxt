import type * as z from 'zod'

export type OrderOrderingField = 'status' | 'createdAt' | 'updatedAt' | 'paymentStatus'

export type Order = z.infer<typeof ZodOrder>
export type OrderDetail = z.infer<typeof ZodOrderDetail>
export type OrderCreateUpdate = z.infer<typeof ZodOrderCreateUpdate>
export type PatchedOrderCreateUpdate = z.infer<typeof ZodPatchedOrderCreateUpdate>

export type OrderStatusEnum = z.infer<typeof ZodOrderStatusEnum>
export type PaymentStatusEnum = z.infer<typeof ZodPaymentStatusEnum>
export type DocumentTypeEnum = z.infer<typeof ZodDocumentTypeEnum>

export type OrderParams = z.infer<typeof ZodOrderParams>
export type OrderUUIDParams = z.infer<typeof ZodOrderUUIDParams>
export type OrderTracking = z.infer<typeof ZodOrderTracking>
export type OrderRefund = z.infer<typeof ZodOrderRefund>
