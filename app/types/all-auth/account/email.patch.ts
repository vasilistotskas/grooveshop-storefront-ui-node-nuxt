import { object, string, boolean, literal, array } from 'zod'
import { ZodEmailAddress } from '~/types/all-auth'

const ZodData = array(ZodEmailAddress)

export const ZodEmailPatchResponse = object({
  status: literal(200),
  data: ZodData,
})

export const ZodEmailPatchBody = object({
  email: string().email().describe('An email address.'),
  primary: boolean().describe('Primary flag.'),
})

export type EmailPatchBody = typeof ZodEmailPatchBody._type
export type EmailPatchResponse = typeof ZodEmailPatchResponse._type
