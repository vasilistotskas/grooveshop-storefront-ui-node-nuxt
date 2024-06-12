import { z } from 'zod'
import { ZodFlow, ZodUnauthenticatedMeta } from '~/types/all-auth'

const ZodNotAuthenticatedData = z.object({
  flows: z.array(ZodFlow),
  methods: z.array(z.any()).optional(),
  user: z.any().optional(),
})

export const ZodNotAuthenticatedResponse = z.object({
  status: z.literal(401),
  data: ZodNotAuthenticatedData,
  meta: ZodUnauthenticatedMeta,
})

export type NotAuthenticatedData = z.infer<typeof ZodNotAuthenticatedData>
export type NotAuthenticatedResponse = z.infer<typeof ZodNotAuthenticatedResponse>
