import { object, string, number, boolean } from 'zod'
import { ZodExpandQuery, ZodLanguageQuery, ZodTimeStampModel, ZodUUIDModel } from '~/types'
import { ZodOrderingQuery } from '~/types/ordering'
import { ZodPaginationQuery } from '~/types/pagination'

export const ZodNotificationUser = object({
  id: number(),
  user: number(),
  notification: number(),
  seen: boolean(),
})
  .merge(ZodUUIDModel)
  .merge(ZodTimeStampModel)

export const ZodNotificationUserParams = object({
  id: string(),
})

export const ZodNotificationUserQuery = object({
  seen: string().nullish(),
  notificationKind: string().nullish(),
})
  .merge(ZodLanguageQuery)
  .merge(ZodExpandQuery)
  .merge(ZodOrderingQuery)
  .merge(ZodPaginationQuery)

export const ZodNotificationUserBody = object({
  user: string(),
  notification: string(),
  seen: boolean(),
})

export type NotificationUser = typeof ZodNotificationUser._type
export type NotificationUserParams = typeof ZodNotificationUserParams._type
export type NotificationUserQuery = typeof ZodNotificationUserQuery._type
export type NotificationUserBody = typeof ZodNotificationUserBody._type
