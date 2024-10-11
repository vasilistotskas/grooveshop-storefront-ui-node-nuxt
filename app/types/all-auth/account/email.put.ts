import { object, string, literal } from 'zod'

export const ZodEmailPutResponse = object({
  status: literal(200),
})

export const ZodEmailPutBody = object({
  email: string().email().describe('An email address.'),
})

export type EmailPutBody = typeof ZodEmailPutBody._type
export type EmailPutResponse = typeof ZodEmailPutResponse._type
