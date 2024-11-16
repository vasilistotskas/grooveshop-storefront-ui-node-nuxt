import * as z from 'zod'

const ZodBlogCategoryTranslations = z.record(
  z.object({
    name: z.string().nullish(),
    description: z.string().nullish(),
  }),
)

export const ZodBlogCategory = z.object({
  translations: ZodBlogCategoryTranslations,
  id: z.number().int(),
  slug: z.string().nullish(),
  parent: z.number().nullish(),
  level: z.number().nullish(),
  treeId: z.number().nullish(),
  absoluteUrl: z.string().nullish(),
  recursivePostCount: z.number().int(),
  mainImagePath: z.string().optional(),
}).merge(ZodUUIDModel).merge(ZodTimeStampModel).merge(ZodSortableModel)

export const ZodBlogCategoryQuery = z
  .object({
    id: z.string().nullish(),
  })
  .merge(ZodLanguageQuery)
  .merge(ZodOrderingQuery)
  .merge(ZodPaginationQuery)

export const ZodBlogCategoryParams = z.object({
  id: z.string(),
})
