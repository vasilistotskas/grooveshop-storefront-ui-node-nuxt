import * as z from 'zod'
import { ZodExpandQuery, ZodLanguageQuery, ZodTimeStampModel, ZodUUIDModel } from '~/types'
import { ZodOrderingQuery } from '~/types/ordering'
import { ZodPaginationQuery } from '~/types/pagination'

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
  kind: z.enum(['error', 'success', 'info', 'warning', 'danger']),
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
  .merge(ZodExpandQuery)
  .merge(ZodOrderingQuery)
  .merge(ZodPaginationQuery)

export type Notification = Readonly<z.infer<typeof ZodNotification>>
export type NotificationParams = z.infer<typeof ZodNotificationParams>
export type NotificationQuery = z.infer<typeof ZodNotificationQuery>
