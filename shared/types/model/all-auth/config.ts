import type * as z from 'zod'

export type AccountConfiguration = z.infer<typeof ZodAccountConfiguration>
export type SocialAccountConfiguration = z.infer<typeof ZodSocialAccountConfiguration>
export type MFAConfiguration = z.infer<typeof ZodMFAConfiguration>
export type UserSessionsConfiguration = z.infer<typeof ZodUserSessionsConfiguration>
