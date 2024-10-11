import { object, literal, array } from 'zod'
import { ZodEmailAddress } from '~/types/all-auth'

const ZodData = array(ZodEmailAddress)

export const ZodEmailGetResponse = object({
  status: literal(200),
  data: ZodData,
})

export type EmailGetResponse = typeof ZodEmailGetResponse._type
