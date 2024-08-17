import { z } from 'zod'
import { ZodAuthenticationMeta, ZodAuthenticated } from '~/types/all-auth'

export const ZodEmailVerifyPostResponse = z.object({
  status: z.literal(200),
  data: ZodAuthenticated,
  meta: ZodAuthenticationMeta,
})

export const ZodEmailVerifyPostBody = z.object({
  key: z.string(),
})

export type EmailVerifyPostResponse = z.infer<typeof ZodEmailVerifyPostResponse>
export type EmailVerifyPostBody = z.infer<typeof ZodEmailVerifyPostBody>
