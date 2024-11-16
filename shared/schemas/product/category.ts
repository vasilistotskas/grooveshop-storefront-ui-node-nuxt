import * as z from 'zod'

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
  categoryMenuImageOneFilename: z.string().optional(),
  categoryMenuImageTwoFilename: z.string().optional(),
  categoryMenuMainBannerFilename: z.string().optional(),
  parent: z.number().nullish(),
  level: z.number(),
  treeId: z.number(),
  absoluteUrl: z.string(),
  recursiveProductCount: z.number(),
}).merge(ZodUUIDModel).merge(ZodTimeStampModel).merge(ZodSeoModel)

export const ZodProductCategory: z.ZodType<ProductCategory>
  = ZodProductCategoryBase.extend({
    children: z.lazy(() => ZodProductCategory.array().nullish()),
  })

export const ZodProductCategoryParams = z.object({
  id: z.string(),
})
