import { z } from 'zod'
import { ZodAuthenticationMeta, ZodMethods, ZodUser } from '~/types/all-auth'

const ZodAuthenticated = z.object({
  user: ZodUser,
  methods: ZodMethods,
})

export const ZodReauthenticateBody = z.object({
  password: z.string().describe('The password.'),
})

export const ZodReauthenticateResponse = z.object({
  status: z.literal(200),
  data: ZodAuthenticated,
  meta: ZodAuthenticationMeta,
})

export type ReauthenticateBody = z.infer<typeof ZodReauthenticateBody>
export type ReauthenticateResponse = z.infer<typeof ZodReauthenticateResponse>
