import { object, array, literal } from 'zod'
import { ZodFlow, ZodUnauthenticatedMeta } from '~/types/all-auth'

const ZodInvalidSessionData = object({
  flows: array(ZodFlow),
})

export const ZodInvalidSessionResponse = object({
  status: literal(410),
  data: ZodInvalidSessionData,
  meta: ZodUnauthenticatedMeta,
})

export type InvalidSessionResponse = typeof ZodInvalidSessionResponse._type
