import { literal, object, array } from 'zod'
import { ZodSession } from '~/types/all-auth'

export const ZodSessionsGetResponse = object({
  status: literal(200),
  data: array(ZodSession),
})

export type SessionsGetResponse = typeof ZodSessionsGetResponse._type
