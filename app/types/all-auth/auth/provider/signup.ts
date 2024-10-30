import * as z from 'zod'
import { ZodAuthenticationMeta, ZodAuthenticated } from '~/types/all-auth'

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
