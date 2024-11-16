import type * as z from 'zod'

export type ZNotification = z.infer<typeof ZodNotification>
export type NotificationParams = z.infer<typeof ZodNotificationParams>
export type NotificationQuery = z.infer<typeof ZodNotificationQuery>
