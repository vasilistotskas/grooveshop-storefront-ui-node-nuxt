import * as z from 'zod'

export const ZodPasswordResetPostResponse = z.object({
  status: z.literal(200),
  data: ZodAuthenticated,
  meta: ZodAuthenticationMeta,
})

export const ZodPasswordResetGetResponse = z.object({
  status: z.literal(200),
  data: z.object({
    user: ZodUser,
  }),
})
