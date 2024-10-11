import { object, string, literal } from 'zod'
import { ZodAuthenticationMeta, ZodAuthenticated } from '~/types/all-auth'

export const ZodPasswordResetPostBody = object({
  key: string(),
  password: string(),
})

export const ZodPasswordResetPostResponse = object({
  status: literal(200),
  data: ZodAuthenticated,
  meta: ZodAuthenticationMeta,
})

export type PasswordResetPostResponse = typeof ZodPasswordResetPostResponse._type
export type PasswordResetPostBody = typeof ZodPasswordResetPostBody._type
