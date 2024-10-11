import { object, array, number, literal } from 'zod'
import { ZodSession } from '~/types/all-auth'

export const ZodSessionsDeleteBody = object({
  sessions: array(number()),
})

export const ZodSessionsDeleteResponse = object({
  status: literal(200),
  data: array(ZodSession),
})

export type SessionsDeleteBody = typeof ZodSessionsDeleteBody._type
export type SessionsDeleteResponse = typeof ZodSessionsDeleteResponse._type
