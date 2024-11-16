import type * as z from 'zod'

export type NotificationUser = Readonly<z.infer<typeof ZodNotificationUser>>
export type NotificationUserParams = z.infer<typeof ZodNotificationUserParams>
export type NotificationUserQuery = z.infer<typeof ZodNotificationUserQuery>
export type NotificationUserBody = z.infer<typeof ZodNotificationUserBody>
