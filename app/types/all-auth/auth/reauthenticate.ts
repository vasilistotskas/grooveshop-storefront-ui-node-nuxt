import { object, string, literal } from 'zod'
import { ZodAuthenticationMeta, ZodAuthenticated } from '~/types/all-auth'

export const ZodReauthenticateBody = object({
  password: string().describe('The password.'),
})

export const ZodReauthenticateResponse = object({
  status: literal(200),
  data: ZodAuthenticated,
  meta: ZodAuthenticationMeta,
})

export type ReauthenticateBody = typeof ZodReauthenticateBody._type
export type ReauthenticateResponse = typeof ZodReauthenticateResponse._type
