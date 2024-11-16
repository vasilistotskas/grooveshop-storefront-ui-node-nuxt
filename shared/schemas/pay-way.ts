import * as z from 'zod'

const ZodPayWayTranslations = z.record(
  z.object({
    name: z.string().nullish(),
  }),
)

export const ZodPayWay = z.object({
  translations: ZodPayWayTranslations,
  id: z.number(),
  active: z.boolean(),
  cost: z.number(),
  freeForOrderAmount: z.number(),
  icon: z.string().nullish(),
  iconAbsoluteUrl: z.string().nullish(),
  iconFilename: z.string().nullish(),
}).merge(ZodUUIDModel).merge(ZodTimeStampModel).merge(ZodSortableModel)

export const ZodPayWayQuery = z
  .object({
    active: z.string().nullish(),
    cost: z.string().nullish(),
    freeForOrderAmount: z.string().nullish(),
  })
  .merge(ZodLanguageQuery)
  .merge(ZodOrderingQuery)
  .merge(ZodPaginationQuery)
