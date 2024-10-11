import { array, any, literal, object, optional } from 'zod'
import { ZodFlow, ZodUnauthenticatedMeta } from '~/types/all-auth'

const ZodNotAuthenticatedData = object({
  flows: array(ZodFlow),
  methods: optional(array(any())),
  user: optional(any()),
})

export const ZodNotAuthenticatedResponse = object({
  status: literal(401),
  data: ZodNotAuthenticatedData,
  meta: ZodUnauthenticatedMeta,
})

export type NotAuthenticatedData = typeof ZodNotAuthenticatedData._type
export type NotAuthenticatedResponse = typeof ZodNotAuthenticatedResponse._type
