import * as z from 'zod'

export const ZodRecoveryCodesGetResponse = z.object({
  status: z.literal(200),
  data: ZodSensitiveRecoveryCodesAuthenticator,
})
