import * as z from 'zod'

export const ZodConfigResponse = z.object({
  status: z.literal(200),
  data: z.object({
    account: ZodAccountConfiguration,
    socialaccount: ZodSocialAccountConfiguration,
    mfa: ZodMFAConfiguration,
    usersessions: ZodUserSessionsConfiguration,
  }),
})
