import * as z from 'zod'

const ZodBlogTagTranslations = z.record(
  z.object({
    name: z.string().nullish(),
  }),
)

export const ZodBlogTag = z.object({
  translations: ZodBlogTagTranslations,
  id: z.number().int(),
  active: z.boolean(),
}).merge(ZodUUIDModel).merge(ZodTimeStampModel).merge(ZodSortableModel)

export const ZodBlogTagQuery = z
  .object({
    id: z.string().nullish(),
    active: z.string().nullish(),
  })
  .merge(ZodLanguageQuery)
  .merge(ZodOrderingQuery)
  .merge(ZodPaginationQuery)

export const ZodBlogTagParams = z.object({
  id: z.string(),
})
