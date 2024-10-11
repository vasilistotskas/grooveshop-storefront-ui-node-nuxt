import type { ZodType } from 'zod'
import { object, string, number, record, lazy } from 'zod'
import { ZodSeoModel, ZodTimeStampModel, ZodUUIDModel } from '~/types'

const ZodProductCategoryTranslations = record(
  object({
    name: string().nullish(),
    description: string().nullish(),
  }),
)

export const ZodProductCategoryBase = object({
  translations: ZodProductCategoryTranslations,
  id: number(),
  slug: string(),
  categoryMenuImageOneFilename: string().nullish(),
  categoryMenuImageTwoFilename: string().nullish(),
  categoryMenuMainBannerFilename: string().nullish(),
  parent: number().nullish(),
  level: number(),
  treeId: number(),
  absoluteUrl: string(),
  recursiveProductCount: number(),
})
  .merge(ZodUUIDModel)
  .merge(ZodTimeStampModel)
  .merge(ZodSeoModel)

export type ProductCategory = typeof ZodProductCategoryBase._type & {
  children?: ProductCategory[] | null
}

export const ZodProductCategory: ZodType<ProductCategory> = ZodProductCategoryBase.extend({
  children: lazy(() => ZodProductCategory.array().nullish()),
})

export const ZodProductCategoryParams = object({
  id: string(),
})
