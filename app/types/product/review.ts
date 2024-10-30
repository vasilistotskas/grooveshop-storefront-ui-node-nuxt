import * as z from 'zod'

import { ZodProduct } from '~/types/product'
import { ZodUserAccount } from '~/types/user/account'
import { ZodOrderingQuery } from '~/types/ordering'
import { ZodPaginationQuery } from '~/types/pagination'
import { ZodExpandQuery, ZodLanguageQuery, ZodPublishableModel, ZodTimeStampModel, ZodUUIDModel } from '~/types'

export const ZodProductReviewStatusEnum = z.enum(['NEW', 'TRUE', 'FALSE'])

const ZodProductReviewTranslations = z.record(
  z.object({
    comment: z.string().nullish(),
  }),
)

export const ZodProductReview = z.object({
  translations: ZodProductReviewTranslations,
  id: z.number(),
  product: z.union([z.number(), z.lazy(() => ZodProduct)]),
  user: z.union([z.number(), z.lazy(() => ZodUserAccount)]),
  rate: z.number(),
  status: z.lazy(() => ZodProductReviewStatusEnum),
}).merge(ZodUUIDModel).merge(ZodTimeStampModel).merge(ZodPublishableModel)

export const ZodProductReviewQuery = z
  .object({
    id: z.string().nullish(),
    productId: z.string().nullish(),
    userId: z.string().nullish(),
    status: z.lazy(() => ZodProductReviewStatusEnum).nullish(),
  })
  .merge(ZodLanguageQuery)
  .merge(ZodExpandQuery)
  .merge(ZodOrderingQuery)
  .merge(ZodPaginationQuery)

export const ZodProductReviewCreateBody = z.object({
  product: z.string(),
  user: z.string(),
  translations: ZodProductReviewTranslations,
  rate: z.string(),
  status: z.string(),
})

export const ZodProductReviewCreateQuery = z
  .object({})
  .merge(ZodLanguageQuery)
  .merge(ZodExpandQuery)

export const ZodProductReviewPutBody = z.object({
  product: z.string(),
  user: z.string(),
  translations: ZodProductReviewTranslations,
  rate: z.string(),
})

export const ZodProductReviewPutQuery = z
  .object({})
  .merge(ZodLanguageQuery)
  .merge(ZodExpandQuery)

export const ZodProductReviewParams = z.object({
  id: z.string(),
})

export const ZodProductReviewUserProductReviewBody = z.object({
  product: z.string(),
})

export type ProductReview = z.infer<typeof ZodProductReview>
export type ProductReviewOrderingField =
  | 'id'
  | 'userId'
  | 'productId'
  | 'createdAt'
  | 'updatedAt'
