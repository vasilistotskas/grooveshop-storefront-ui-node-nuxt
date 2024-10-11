import { object, string, literal, array } from 'zod'
import { ZodEmailAddress } from '~/types/all-auth'

const ZodData = array(ZodEmailAddress)

export const ZodEmailPostBody = object({
  email: string().email().describe('An email address.'),
})

export const ZodEmailPostResponse = object({
  status: literal(200),
  data: ZodData,
})

export type EmailPostBody = typeof ZodEmailPostBody._type
export type EmailPostResponse = typeof ZodEmailPostResponse._type
