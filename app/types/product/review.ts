import { object, string, number, union, lazy, record, enum as zEnum } from 'zod'

import { ZodProduct } from '~/types/product'
import { ZodUserAccount } from '~/types/user/account'
import { ZodOrderingQuery } from '~/types/ordering'
import { ZodPaginationQuery } from '~/types/pagination'
import { ZodExpandQuery, ZodLanguageQuery, ZodPublishableModel, ZodTimeStampModel, ZodUUIDModel } from '~/types'

export const ZodProductReviewStatusEnum = zEnum(['NEW', 'TRUE', 'FALSE'])

const ZodProductReviewTranslations = record(
  object({
    comment: string().nullish(),
  }),
)

export const ZodProductReview = object({
  translations: ZodProductReviewTranslations,
  id: number(),
  product: union([number(), lazy(() => ZodProduct)]),
  user: union([number(), lazy(() => ZodUserAccount)]),
  rate: number(),
  status: lazy(() => ZodProductReviewStatusEnum),
}).merge(ZodUUIDModel).merge(ZodTimeStampModel).merge(ZodPublishableModel)

export const ZodProductReviewQuery = object({
  id: string().nullish(),
  productId: string().nullish(),
  userId: string().nullish(),
  status: lazy(() => ZodProductReviewStatusEnum).nullish(),
})
  .merge(ZodLanguageQuery)
  .merge(ZodExpandQuery)
  .merge(ZodOrderingQuery)
  .merge(ZodPaginationQuery)

export const ZodProductReviewCreateBody = object({
  product: string(),
  user: string(),
  translations: ZodProductReviewTranslations,
  rate: string(),
  status: string(),
})

export const ZodProductReviewCreateQuery = object({})
  .merge(ZodLanguageQuery)
  .merge(ZodExpandQuery)

export const ZodProductReviewPutBody = object({
  product: string(),
  user: string(),
  translations: ZodProductReviewTranslations,
  rate: string(),
})

export const ZodProductReviewPutQuery = object({})
  .merge(ZodLanguageQuery)
  .merge(ZodExpandQuery)

export const ZodProductReviewParams = object({
  id: string(),
})

export const ZodProductReviewUserProductReviewBody = object({
  product: string(),
})

export type ProductReview = typeof ZodProductReview._type
export type ProductReviewOrderingField =
  | 'id'
  | 'userId'
  | 'productId'
  | 'createdAt'
  | 'updatedAt'
