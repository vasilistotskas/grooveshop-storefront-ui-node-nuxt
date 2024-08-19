import { z } from 'zod'

import {
  ZodExpandQuery,
  ZodLanguageQuery,
  ZodWeight,
} from '~/types'
import { ZodOrderingQuery } from '~/types/ordering'
import { ZodPaginationQuery } from '~/types/pagination'
import { ZodProductCategory } from '~/types/product/category'
import { ZodVat } from '~/types/vat'

const ZodProductTranslations = z.record(
  z.object({
    name: z.string().nullish(),
    description: z.string().nullish(),
  }),
)

export const ZodProduct = z.object({
  translations: ZodProductTranslations,
  id: z.number().int(),
  slug: z.string(),
  category: z.union([z.number(), z.lazy(() => ZodProductCategory)]),
  absoluteUrl: z.string(),
  price: z.number(),
  vat: z.union([z.number(), z.lazy(() => ZodVat)]),
  vatPercent: z.number(),
  vatValue: z.number(),
  finalPrice: z.number(),
  viewCount: z.number().int(),
  likesCount: z.number().int(),
  stock: z.number().int(),
  active: z.boolean(),
  weight: ZodWeight.nullish(),
  seoTitle: z.string().nullish(),
  seoDescription: z.string().nullish(),
  seoKeywords: z.string().nullish(),
  uuid: z.string().uuid(),
  discountPercent: z.number(),
  discountValue: z.number(),
  priceSavePercent: z.number(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  mainImageAbsoluteUrl: z.string().nullish(),
  mainImageFilename: z.string().nullish(),
  reviewAverage: z.number(),
  approvedReviewAverage: z.number(),
  reviewCount: z.number().int(),
  approvedReviewCount: z.number().int(),
})

export const ZodProductCreateBody = z.object({
  name: z.string(),
  slug: z.string(),
  category: z.number().int(),
  description: z.string().nullish(),
  price: z.number(),
  vat: z.number(),
  viewCount: z.number().int().nullish(),
  stock: z.number().int().nullish(),
  active: z.boolean().nullish(),
  weight: ZodWeight.nullish(),
  seoTitle: z.string().nullish(),
  seoDescription: z.string().nullish(),
  seoKeywords: z.string().nullish(),
  discountPercent: z.number().nullish(),
})

export const ZodProductParams = z.object({
  id: z.string(),
})

export const ZodProductQuery = z
  .object({
    category: z.union([z.number(), z.string()]).nullish(),
  })
  .merge(ZodLanguageQuery)
  .merge(ZodExpandQuery)
  .merge(ZodOrderingQuery)
  .merge(ZodPaginationQuery)

export type Product = Readonly<z.infer<typeof ZodProduct>>
export type ProductOrderingField =
  | 'price'
  | 'createdAt'
  | 'discountValue'
  | 'finalPrice'
  | 'priceSavePercent'
  | 'reviewAverage'
  | 'approvedReviewAverage'
  | 'likesCount'
