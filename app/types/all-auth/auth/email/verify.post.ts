import { object, literal, string } from 'zod'
import { ZodAuthenticationMeta, ZodAuthenticated } from '~/types/all-auth'

export const ZodEmailVerifyPostResponse = object({
  status: literal(200),
  data: ZodAuthenticated,
  meta: ZodAuthenticationMeta,
})

export const ZodEmailVerifyPostBody = object({
  key: string(),
})

export type EmailVerifyPostResponse = typeof ZodEmailVerifyPostResponse._type
export type EmailVerifyPostBody = typeof ZodEmailVerifyPostBody._type
