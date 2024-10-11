import { object, string, literal } from 'zod'
import { ZodAuthenticationMeta, ZodAuthenticated } from '~/types/all-auth'

export const ZodProviderSignupBody = object({
  email: string().email().describe('The email address.'),
})

export const ZodProviderSignupResponse = object({
  status: literal(200),
  data: ZodAuthenticated,
  meta: ZodAuthenticationMeta,
})

export type ProviderSignupBody = typeof ZodProviderSignupBody._type
export type ProviderSignupResponse = typeof ZodProviderSignupResponse._type
