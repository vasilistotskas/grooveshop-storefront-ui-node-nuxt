import { object, string, number, boolean, union, lazy, record, optional } from 'zod'

import {
  ZodExpandQuery,
  ZodLanguageQuery,
  ZodSeoModel,
  ZodTimeStampModel,
  ZodUUIDModel,
  ZodWeight,
} from '~/types'
import { ZodOrderingQuery } from '~/types/ordering'
import { ZodPaginationQuery } from '~/types/pagination'
import { ZodProductCategory } from '~/types/product/category'
import { ZodVat } from '~/types/vat'

const ZodProductTranslations = record(
  object({
    name: string().nullish(),
    description: string().nullish(),
  }),
)

export const ZodProduct = object({
  translations: ZodProductTranslations,
  id: number().int(),
  slug: string(),
  category: union([number(), lazy(() => ZodProductCategory)]),
  absoluteUrl: string(),
  price: number(),
  vat: union([number(), lazy(() => ZodVat)]),
  vatPercent: number(),
  vatValue: number(),
  finalPrice: number(),
  viewCount: number().int(),
  likesCount: number().int(),
  stock: number().int(),
  active: boolean(),
  weight: ZodWeight.nullish(),
  discountPercent: number(),
  discountValue: number(),
  priceSavePercent: number(),
  mainImagePath: optional(string()),
  reviewAverage: number(),
  approvedReviewAverage: number(),
  reviewCount: number().int(),
  approvedReviewCount: number().int(),
})
  .merge(ZodUUIDModel)
  .merge(ZodTimeStampModel)
  .merge(ZodSeoModel)

export const ZodProductCreateBody = object({
  name: string(),
  slug: string(),
  category: number().int(),
  description: string().nullish(),
  price: number(),
  vat: number(),
  viewCount: number().int().nullish(),
  stock: number().int().nullish(),
  active: boolean().nullish(),
  weight: ZodWeight.nullish(),
  discountPercent: number().nullish(),
}).merge(ZodSeoModel)

export const ZodProductParams = object({
  id: string(),
})

export const ZodProductQuery = object({
  category: union([number(), string()]).nullish(),
})
  .merge(ZodLanguageQuery)
  .merge(ZodExpandQuery)
  .merge(ZodOrderingQuery)
  .merge(ZodPaginationQuery)

export type ProductOrderingField =
  | 'price'
  | 'createdAt'
  | 'discountValue'
  | 'finalPrice'
  | 'priceSavePercent'
  | 'reviewAverage'
  | 'approvedReviewAverage'
  | 'likesCount'

export type Product = typeof ZodProduct._type
