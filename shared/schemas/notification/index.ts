import * as z from 'zod'

const ZodNotificationTranslations = z.record(
  z.object({
    title: z.string().nullish(),
    message: z.string().nullish(),
  }),
)

export const ZodNotification = z.object({
  translations: ZodNotificationTranslations,
  id: z.number(),
  link: z.string().nullish(),
  kind: z.enum(['ERROR', 'SUCCESS', 'INFO', 'WARNING', 'DANGER']),
  expiryDate: z.string().datetime({ offset: true }).nullish(),
}).merge(ZodUUIDModel).merge(ZodTimeStampModel)

export const ZodNotificationParams = z.object({
  id: z.string(),
})

export const ZodNotificationQuery = z
  .object({
    id: z.string().nullish(),
    kind: z.string().nullish(),
  })
  .merge(ZodLanguageQuery)
  .merge(ZodOrderingQuery)
  .merge(ZodPaginationQuery)
