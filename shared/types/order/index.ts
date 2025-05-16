import type * as z from 'zod'

export type OrderOrderingField = 'status' | 'createdAt' | 'updatedAt' | 'paymentStatus'

// Basic order types
export type Order = z.infer<typeof ZodOrder>
export type OrderDetail = z.infer<typeof ZodOrderDetail>
export type OrderCreateUpdate = z.infer<typeof ZodOrderCreateUpdate>
export type PatchedOrderCreateUpdate = z.infer<typeof ZodPatchedOrderCreateUpdate>

// Status and enum types
export type OrderStatusEnum = z.infer<typeof ZodOrderStatusEnum>
export type PaymentStatusEnum = z.infer<typeof ZodPaymentStatusEnum>
export type DocumentTypeEnum = z.infer<typeof ZodDocumentTypeEnum>

// Parameters and request types
export type OrderParams = z.infer<typeof ZodOrderParams>
export type OrderUUIDParams = z.infer<typeof ZodOrderUUIDParams>
export type OrderTracking = z.infer<typeof ZodOrderTracking>
export type OrderStatusUpdate = z.infer<typeof ZodOrderStatusUpdate>
export type OrderPaymentStatusUpdate = z.infer<typeof ZodOrderPaymentStatusUpdate>
export type OrderRefund = z.infer<typeof ZodOrderRefund>
