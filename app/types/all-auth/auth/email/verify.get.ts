import { object, string, optional, boolean, literal } from 'zod'
import { ZodUser } from '~/types/all-auth'

const ZodData = object({
  email: string().email().describe('The email address.'),
  user: ZodUser,
})

const ZodEmailVerifyMeta = object({
  is_authenticating: optional(boolean()),
})

export const ZodEmailVerifyGetResponse = object({
  status: literal(200),
  data: ZodData,
  meta: ZodEmailVerifyMeta,
})

export type EmailVerifyGetResponse = typeof ZodEmailVerifyGetResponse._type
