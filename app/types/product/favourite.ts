import { object, string, number, union, lazy, array } from 'zod'

import { ZodProduct } from '~/types/product'
import { ZodUserAccount } from '~/types/user/account'
import { ZodOrderingQuery } from '~/types/ordering'
import { ZodPaginationQuery } from '~/types/pagination'
import { ZodExpandQuery, ZodLanguageQuery, ZodTimeStampModel, ZodUUIDModel } from '~/types'

export const ZodProductFavourite = object({
  id: number(),
  product: union([number(), lazy(() => ZodProduct)]),
  user: union([number(), lazy(() => ZodUserAccount)]),
}).merge(ZodUUIDModel).merge(ZodTimeStampModel)

export const ZodProductFavouriteQuery = object({
  id: string().nullish(),
  userId: string().nullish(),
  productId: string().nullish(),
})
  .merge(ZodLanguageQuery)
  .merge(ZodExpandQuery)
  .merge(ZodOrderingQuery)
  .merge(ZodPaginationQuery)

export const ZodProductFavouriteCreateBody = object({
  user: string(),
  product: string(),
})

export const ZodProductFavouritesByProductsBody = object({
  productIds: array(number()),
})

export const ZodProductFavouriteParams = object({
  id: string(),
})

export type ProductFavourite = typeof ZodProductFavourite._type
export type ProductFavouriteOrderingField =
  | 'id'
  | 'productId'
  | 'userId'
  | 'createdAt'
  | 'updatedAt'
