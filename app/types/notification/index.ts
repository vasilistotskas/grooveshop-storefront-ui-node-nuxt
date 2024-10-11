import { object, string, number, record, enum as zEnum } from 'zod'
import { ZodExpandQuery, ZodLanguageQuery, ZodTimeStampModel, ZodUUIDModel } from '~/types'
import { ZodOrderingQuery } from '~/types/ordering'
import { ZodPaginationQuery } from '~/types/pagination'

const ZodNotificationTranslations = record(
  object({
    title: string().nullish(),
    message: string().nullish(),
  }),
)

export const ZodNotification = object({
  translations: ZodNotificationTranslations,
  id: number(),
  link: string().nullish(),
  kind: zEnum(['error', 'success', 'info', 'warning', 'danger']),
  expiryDate: string().datetime({ offset: true }).nullish(),
})
  .merge(ZodUUIDModel)
  .merge(ZodTimeStampModel)

export const ZodNotificationParams = object({
  id: string(),
})

export const ZodNotificationQuery = object({
  id: string().nullish(),
  kind: string().nullish(),
})
  .merge(ZodLanguageQuery)
  .merge(ZodExpandQuery)
  .merge(ZodOrderingQuery)
  .merge(ZodPaginationQuery)

export type Notification = typeof ZodNotification._type
export type NotificationParams = typeof ZodNotificationParams._type
export type NotificationQuery = typeof ZodNotificationQuery._type
