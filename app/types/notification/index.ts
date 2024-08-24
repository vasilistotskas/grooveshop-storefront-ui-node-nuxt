import { z } from 'zod'
import { ZodExpandQuery, ZodLanguageQuery } from '~/types'
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
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  uuid: z.string().uuid(),
})

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
