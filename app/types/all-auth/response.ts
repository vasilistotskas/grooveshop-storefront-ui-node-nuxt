import { object, literal, optional } from 'zod'
import { ZodAuthenticationMeta, ZodAuthenticated } from '~/types/all-auth'

export const ZodAllAuthResponse = object({
  status: literal(200),
  data: ZodAuthenticated,
  meta: optional(ZodAuthenticationMeta),
})

export type AllAuthResponse = typeof ZodAllAuthResponse._type
