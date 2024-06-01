import { z } from 'zod'
import { ZodAuthenticationMeta, ZodMethods, ZodUser } from '~/types/all-auth'

const ZodAuthenticated = z.object({
  user: ZodUser,
  methods: ZodMethods,
})

export const ZodProviderSignupBody = z.object({
  email: z.string().email().describe('The email address.'),
})

export const ZodProviderSignupResponse = z.object({
  status: z.literal(200),
  data: ZodAuthenticated,
  meta: ZodAuthenticationMeta,
})

export type ProviderSignupBody = z.infer<typeof ZodProviderSignupBody>
export type ProviderSignupResponse = z.infer<typeof ZodProviderSignupResponse>
