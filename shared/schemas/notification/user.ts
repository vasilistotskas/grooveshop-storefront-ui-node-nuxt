import * as z from 'zod'

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
  .merge(ZodOrderingQuery)
  .merge(ZodPaginationQuery)

export const ZodNotificationUserBody = z.object({
  user: z.string(),
  notification: z.string(),
  seen: z.boolean(),
})
