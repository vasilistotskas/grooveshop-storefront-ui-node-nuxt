import { object, literal } from 'zod'
import { ZodUser } from '~/types/all-auth'

const ZodData = object({
  user: ZodUser,
})

export const ZodPasswordResetGetResponse = object({
  status: literal(200),
  data: ZodData,
})

export type PasswordResetGetResponse = typeof ZodPasswordResetGetResponse._type
