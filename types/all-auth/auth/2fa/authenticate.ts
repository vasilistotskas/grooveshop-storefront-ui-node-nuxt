import { z } from 'zod'
import { ZodAuthenticationMeta, ZodMethods, ZodUser } from '~/types/all-auth'

const ZodAuthenticated = z.object({
  user: ZodUser,
  methods: ZodMethods,
})

export const ZodTwoFaAuthenticateBody = z.object({
  code: z.string().describe('An authenticator code.'),
})

export const ZodTwoFaAuthenticateResponse = z.object({
  status: z.literal(200),
  data: ZodAuthenticated,
  meta: ZodAuthenticationMeta,
})

export type TwoFaAuthenticateBody = z.infer<typeof ZodTwoFaAuthenticateBody>
export type TwoFaAuthenticateResponse = z.infer<typeof ZodTwoFaAuthenticateResponse>
