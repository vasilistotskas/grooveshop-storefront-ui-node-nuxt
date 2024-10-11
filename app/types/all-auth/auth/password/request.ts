import { object, literal, string } from 'zod'

export const ZodPasswordRequestResponse = object({
  status: literal(200),
})

export const ZodPasswordRequestBody = object({
  email: string().email().describe('The email address.'),
})

export type PasswordRequestBody = typeof ZodPasswordRequestBody._type
export type PasswordRequestResponse = typeof ZodPasswordRequestResponse._type
