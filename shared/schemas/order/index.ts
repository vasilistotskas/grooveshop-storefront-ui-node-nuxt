import * as z from 'zod'

// Order status enum
export const ZodOrderStatusEnum = z.enum([
  'PENDING',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'COMPLETED',
  'CANCELED',
  'RETURNED',
  'REFUNDED',
])

// Payment status enum
export const ZodPaymentStatusEnum = z.enum([
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
  'CANCELED',
])

export const ZodDocumentTypeEnum = z.enum([
  'RECEIPT',
  'INVOICE',
  'PROFORMA',
  'SHIPPING_LABEL',
  'RETURN_LABEL',
  'CREDIT_NOTE',
])

// Base order schema
export const ZodOrder = z.object({
  id: z.number(),
  user: z.number().nullish(),
  country: z.lazy(() => ZodCountry),
  region: z.lazy(() => ZodRegion),
  floor: ZodFloorEnum.nullish(),
  locationType: ZodLocationTypeEnum.nullish(),
  payWay: z.lazy(() => ZodPayWay),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  street: z.string(),
  streetNumber: z.string(),
  zipcode: z.string(),
  place: z.string().nullish(),
  city: z.string(),
  phone: z.string(),
  mobilePhone: z.string().nullish(),
  status: ZodOrderStatusEnum,
  statusDisplay: z.string(),
  statusUpdatedAt: z.string().datetime().nullish(),
  paymentStatus: ZodPaymentStatusEnum,
  paymentId: z.string(),
  paymentMethod: z.string(),
  customerNotes: z.string().nullish(),
  shippingPrice: z.number(),
  paidAmount: z.number(),
  documentType: ZodDocumentTypeEnum,
  trackingNumber: z.string().nullish(),
  trackingUrl: z.string().nullish(),
  totalPriceItems: z.number(),
  totalPriceExtra: z.number(),
  fullAddress: z.string(),
  canBeCanceled: z.boolean(),
  isPaid: z.boolean(),
  items: z.array(z.lazy(() => ZodOrderItem)),
}).merge(ZodUUIDModel).merge(ZodTimeStampModel)

// Order detail schema with items included
export const ZodOrderDetail = ZodOrder.extend({
  items: z.array(z.lazy(() => ZodOrderItem)),
})

// Order query parameters
export const ZodOrderQuery = z.object({
  search: z.string().optional(),
  userId: z.number().nullish().optional(),
  status: ZodOrderStatusEnum.optional(),
  paymentStatus: ZodPaymentStatusEnum.optional(),
})
  .merge(ZodLanguageQuery)
  .merge(ZodOrderingQuery)
  .merge(ZodPaginationQuery)

// Order create and update schema
export const ZodOrderCreateUpdate = z.object({
  user: z.number().nullish().optional(),
  country: z.string().or(z.number()),
  region: z.string().or(z.number()),
  floor: ZodFloorEnum.nullish().optional(),
  locationType: ZodLocationTypeEnum.nullish().optional(),
  payWay: z.number(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  street: z.string(),
  streetNumber: z.string(),
  zipcode: z.string(),
  place: z.string().nullish().optional(),
  city: z.string(),
  phone: z.string(),
  mobilePhone: z.string().nullish().optional(),
  status: ZodOrderStatusEnum.optional(),
  paymentStatus: ZodPaymentStatusEnum.optional(),
  customerNotes: z.string().nullish().optional(),
  shippingPrice: z.number(),
  documentType: ZodDocumentTypeEnum,
  items: z.array(z.lazy(() => ZodOrderCreateItem)).optional(),
})

// Order patched update schema (all fields optional)
export const ZodPatchedOrderCreateUpdate = ZodOrderCreateUpdate.partial()

// Order params for route parameters
export const ZodOrderParams = z.object({
  id: z.string().or(z.number()).transform(val => String(val)),
})

// Order UUID params for route parameters
export const ZodOrderUUIDParams = z.object({
  uuid: z.string().uuid(),
})

// Tracking info schema
export const ZodOrderTracking = z.object({
  trackingNumber: z.string(),
  trackingUrl: z.string().url().optional(),
})

// Status update schema
export const ZodOrderStatusUpdate = z.object({
  status: ZodOrderStatusEnum,
})

// Payment status update schema
export const ZodOrderPaymentStatusUpdate = z.object({
  paymentStatus: ZodPaymentStatusEnum,
})

// Order refund schema
export const ZodOrderRefund = z.object({
  reason: z.string().optional(),
  amount: z.number().optional(),
})
