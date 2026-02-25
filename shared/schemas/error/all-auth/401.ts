import * as z from 'zod'

export const ZodNotAuthenticatedResponse = z.object({
  status: z.literal(401),
  data: z.object({
    flows: z.array(ZodFlow),
    methods: ZodMethods.optional(),
    user: ZodUser.optional(),
  }),
  meta: ZodUnauthenticatedMeta,
})
