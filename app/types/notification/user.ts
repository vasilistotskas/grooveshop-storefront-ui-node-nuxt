import * as z from 'zod'
import { ZodExpandQuery, ZodLanguageQuery, ZodTimeStampModel, ZodUUIDModel } from '~/types'
import { ZodOrderingQuery } from '~/types/ordering'
import { ZodPaginationQuery } from '~/types/pagination'

export const ZodNotificationUser = z.object({
  id: z.number(),
  user: z.number(),
  notification: z.number(),
  seen: z.boolean(),
}).merge(ZodUUIDModel).merge(ZodTimeStampModel)

export const ZodNotificationUserParams = z.object({
  id: z.string(),
})

export const ZodNotificationUserQuery = z
  .object({
    seen: z.string().nullish(),
    notificationKind: z.string().nullish(),
  })
  .merge(ZodLanguageQuery)
  .merge(ZodExpandQuery)
  .merge(ZodOrderingQuery)
  .merge(ZodPaginationQuery)

export const ZodNotificationUserBody = z.object({
  user: z.string(),
  notification: z.string(),
  seen: z.boolean(),
})

export type NotificationUser = Readonly<z.infer<typeof ZodNotificationUser>>
export type NotificationUserParams = z.infer<typeof ZodNotificationUserParams>
export type NotificationUserQuery = z.infer<typeof ZodNotificationUserQuery>
export type NotificationUserBody = z.infer<typeof ZodNotificationUserBody>
