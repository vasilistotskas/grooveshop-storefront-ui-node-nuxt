import { object, string, number, array, union, lazy, nativeEnum } from 'zod'

import { ZodCountry } from '~/types/country'
import { FloorChoicesEnum, LocationChoicesEnum, ZodLanguageQuery, ZodTimeStampModel, ZodUUIDModel } from '~/types'
import { ZodOrderCreateItem, ZodOrderCreateResponseItem, ZodOrderItem } from '~/types/order/order-item'
import { ZodPayWay } from '~/types/pay-way'
import { ZodRegion } from '~/types/region'
import { ZodOrderingQuery } from '~/types/ordering'
import { ZodPaginationQuery } from '~/types/pagination'

export const ZodOrderStatusEnum = nativeEnum({
  SENT: 'SENT',
  PAID_AND_SENT: 'PAID_AND_SENT',
  CANCELED: 'CANCELED',
  PENDING: 'PENDING',
})

export const ZodDocumentTypeEnum = nativeEnum({
  RECEIPT: 'RECEIPT',
  INVOICE: 'INVOICE',
})

export const ZodOrder = object({
  id: number(),
  user: number().nullish(),
  payWay: lazy(() => ZodPayWay),
  country: lazy(() => ZodCountry),
  region: lazy(() => ZodRegion),
  floor: nativeEnum(FloorChoicesEnum).nullish(),
  locationType: nativeEnum(LocationChoicesEnum).nullish(),
  email: string(),
  firstName: string(),
  lastName: string(),
  street: string(),
  streetNumber: string(),
  zipcode: string(),
  place: string().nullish(),
  city: string(),
  phone: string(),
  mobilePhone: string().nullish(),
  status: lazy(() => ZodOrderStatusEnum),
  customerNotes: string().nullish(),
  shippingPrice: number(),
  paidAmount: number(),
  documentType: lazy(() => ZodDocumentTypeEnum),
  items: array(lazy(() => ZodOrderItem)),
  totalPriceItems: number(),
  totalPriceExtra: number(),
  fullAddress: string(),
}).merge(ZodUUIDModel).merge(ZodTimeStampModel)

export const ZodOrderQuery = object({
  userId: string().nullish(),
  status: string().nullish(),
})
  .merge(ZodLanguageQuery)
  .merge(ZodOrderingQuery)
  .merge(ZodPaginationQuery)

export const ZodOrderCreateBody = object({
  user: union([number(), string()]).nullish(),
  country: string(),
  region: string(),
  floor: union([nativeEnum(FloorChoicesEnum), string()]).nullish(),
  locationType: union([nativeEnum(LocationChoicesEnum), string()]).nullish(),
  street: string(),
  streetNumber: string(),
  payWay: number(),
  status: lazy(() => ZodOrderStatusEnum).nullish(),
  firstName: string(),
  lastName: string(),
  email: string().email(),
  zipcode: string(),
  place: string().nullish(),
  city: string(),
  phone: string(),
  mobilePhone: string().nullish(),
  customerNotes: string().nullish(),
  shippingPrice: number(),
  documentType: lazy(() => ZodDocumentTypeEnum),
  items: array(lazy(() => ZodOrderCreateItem)),
})

export const ZodOrderCreateResponse = object({
  id: number(),
  user: union([number(), string()]).nullish(),
  country: string(),
  region: string(),
  floor: union([nativeEnum(FloorChoicesEnum), string()]).nullish(),
  locationType: union([nativeEnum(LocationChoicesEnum), string()]).nullish(),
  street: string(),
  streetNumber: string(),
  payWay: number(),
  status: lazy(() => ZodOrderStatusEnum).nullish(),
  firstName: string(),
  lastName: string(),
  email: string().email(),
  zipcode: string(),
  place: string().nullish(),
  city: string(),
  phone: string(),
  mobilePhone: string().nullish(),
  customerNotes: string().nullish(),
  items: array(lazy(() => ZodOrderCreateResponseItem)),
  shippingPrice: number(),
  documentType: lazy(() => ZodDocumentTypeEnum),
  totalPriceItems: number(),
  totalPriceExtra: number(),
  fullAddress: string(),
}).merge(ZodUUIDModel).merge(ZodTimeStampModel)

export const ZodOrderParams = object({
  id: string(),
})

export const ZodOrderUUIDParams = object({
  uuid: string(),
})

export type OrderOrderingField = 'status' | 'createdAt' | 'updatedAt'
export type Order = typeof ZodOrder._type
