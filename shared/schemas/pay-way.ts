import * as z from 'zod'

const ZodPayWayTranslations = z.record(
  z.object({
    name: z.string().nullish(),
    description: z.string().nullish(),
    instructions: z.string().nullish(),
  }),
)

export const ZodPayWay = z.object({
  translations: ZodPayWayTranslations,
  id: z.number(),
  active: z.boolean(),
  cost: z.number(),
  freeForOrderAmount: z.number(),
  icon: z.string().nullish(),
  providerCode: z.string().nullish(),
  isOnlinePayment: z.boolean().default(false),
  requiresConfirmation: z.boolean().default(false),
  configuration: z.any(),
  iconAbsoluteUrl: z.string().nullish(),
  iconFilename: z.string().nullish(),
}).merge(ZodUUIDModel).merge(ZodTimeStampModel).merge(ZodSortableModel)

export const ZodPayWayQuery = z
  .object({
    active: z.string().nullish(),
    cost: z.string().nullish(),
    freeForOrderAmount: z.string().nullish(),
    providerCode: z.string().nullish(),
    isOnlinePayment: z.string().nullish(),
    requiresConfirmation: z.string().nullish(),
  })
  .merge(ZodLanguageQuery)
  .merge(ZodOrderingQuery)
  .merge(ZodPaginationQuery)
