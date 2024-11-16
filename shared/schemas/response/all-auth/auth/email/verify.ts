import * as z from 'zod'

export const ZodEmailVerifyPostResponse = z.object({
  status: z.literal(200),
  data: ZodAuthenticated,
  meta: ZodAuthenticationMeta,
})

export const ZodEmailVerifyGetResponse = z.object({
  status: z.literal(200),
  data: z.object({
    email: z.string().email(),
    user: ZodUser,
  }),
  meta: z.object({
    is_authenticating: z.boolean().optional(),
  }),
})
