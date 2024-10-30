import * as z from 'zod'
import { ZodSeoModel, ZodTimeStampModel, ZodUUIDModel } from '~/types'

const ZodProductCategoryTranslations = z.record(
  z.object({
    name: z.string().nullish(),
    description: z.string().nullish(),
  }),
)

export const ZodProductCategoryBase = z.object({
  translations: ZodProductCategoryTranslations,
  id: z.number(),
  slug: z.string(),
  categoryMenuImageOneFilename: z.string().nullish(),
  categoryMenuImageTwoFilename: z.string().nullish(),
  categoryMenuMainBannerFilename: z.string().nullish(),
  parent: z.number().nullish(),
  level: z.number(),
  treeId: z.number(),
  absoluteUrl: z.string(),
  recursiveProductCount: z.number(),
}).merge(ZodUUIDModel).merge(ZodTimeStampModel).merge(ZodSeoModel)

export type ProductCategory = z.infer<typeof ZodProductCategoryBase> & {
  children?: ProductCategory[] | null
}

export const ZodProductCategory: z.ZodType<ProductCategory>
  = ZodProductCategoryBase.extend({
    children: z.lazy(() => ZodProductCategory.array().nullish()),
  })

export const ZodProductCategoryParams = z.object({
  id: z.string(),
})
