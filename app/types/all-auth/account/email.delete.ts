import { object, literal, array, string } from 'zod'
import { ZodEmailAddress } from '~/types/all-auth'

const ZodData = array(ZodEmailAddress)

export const ZodEmailDeleteResponse = object({
  status: literal(200),
  data: ZodData,
})

export const ZodEmailDeleteBody = object({
  email: string().email().describe('An email address.'),
})

export type EmailDeleteBody = typeof ZodEmailDeleteBody._type
export type EmailDeleteResponse = typeof ZodEmailDeleteResponse._type
