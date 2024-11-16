import * as z from 'zod'

export const ZodOrderStatusEnum = z.enum([
  'SENT',
  'PAID_AND_SENT',
  'CANCELED',
  'PENDING',
])
export const ZodDocumentTypeEnum = z.enum(['RECEIPT', 'INVOICE'])

export const ZodOrder = z.object({
  id: z.number(),
  user: z.number().nullish(),
  payWay: z.lazy(() => ZodPayWay),
  country: z.lazy(() => ZodCountry),
  region: z.lazy(() => ZodRegion),
  floor: z.nativeEnum(FloorChoicesEnum).nullish(),
  locationType: z.nativeEnum(LocationChoicesEnum).nullish(),
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
  status: z.lazy(() => ZodOrderStatusEnum),
  customerNotes: z.string().nullish(),
  shippingPrice: z.number(),
  paidAmount: z.number(),
  documentType: z.lazy(() => ZodDocumentTypeEnum),
  items: z.array(z.lazy(() => ZodOrderItem)),
  totalPriceItems: z.number(),
  totalPriceExtra: z.number(),
  fullAddress: z.string(),
}).merge(ZodUUIDModel).merge(ZodTimeStampModel)

export const ZodOrderQuery = z
  .object({
    userId: z.string().nullish(),
    status: z.string().nullish(),
  })
  .merge(ZodLanguageQuery)
  .merge(ZodOrderingQuery)
  .merge(ZodPaginationQuery)

export const ZodOrderCreateBody = z.object({
  user: z.union([z.number(), z.string()]).nullish(),
  country: z.string(),
  region: z.string(),
  floor: z.union([z.nativeEnum(FloorChoicesEnum), z.string()]).nullish(),
  locationType: z
    .union([z.nativeEnum(LocationChoicesEnum), z.string()])
    .nullish(),
  street: z.string(),
  streetNumber: z.string(),
  payWay: z.number(),
  status: z.lazy(() => ZodOrderStatusEnum).nullish(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  zipcode: z.string(),
  place: z.string().nullish(),
  city: z.string(),
  phone: z.string(),
  mobilePhone: z.string().nullish(),
  customerNotes: z.string().nullish(),
  shippingPrice: z.number(),
  documentType: z.lazy(() => ZodDocumentTypeEnum),
  items: z.array(z.lazy(() => ZodOrderCreateItem)),
})

export const ZodOrderCreateResponse = z.object({
  id: z.number(),
  user: z.union([z.number(), z.string()]).nullish(),
  country: z.string(),
  region: z.string(),
  floor: z.union([z.nativeEnum(FloorChoicesEnum), z.string()]).nullish(),
  locationType: z
    .union([z.nativeEnum(LocationChoicesEnum), z.string()])
    .nullish(),
  street: z.string(),
  streetNumber: z.string(),
  payWay: z.number(),
  status: z.lazy(() => ZodOrderStatusEnum).nullish(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  zipcode: z.string(),
  place: z.string().nullish(),
  city: z.string(),
  phone: z.string(),
  mobilePhone: z.string().nullish(),
  customerNotes: z.string().nullish(),
  items: z.array(z.lazy(() => ZodOrderCreateResponseItem)),
  shippingPrice: z.number(),
  documentType: z.lazy(() => ZodDocumentTypeEnum),
  totalPriceItems: z.number(),
  totalPriceExtra: z.number(),
  fullAddress: z.string(),
}).merge(ZodUUIDModel).merge(ZodTimeStampModel)

export const ZodOrderParams = z.object({
  id: z.string(),
})

export const ZodOrderUUIDParams = z.object({
  uuid: z.string(),
})
