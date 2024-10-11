import { object, string } from 'zod'

export const ZodCodeRequestBody = object({
  email: string().email().describe('The email address.'),
})

export type CodeRequestBody = typeof ZodCodeRequestBody._type
