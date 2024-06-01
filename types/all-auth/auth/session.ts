import { z } from 'zod'
import { ZodAuthenticationMeta, ZodMethods, ZodUser } from '~/types/all-auth'

const ZodAuthenticated = z.object({
  user: ZodUser,
  methods: ZodMethods,
})

export const ZodSessionResponse = z.object({
  status: z.literal(200),
  data: ZodAuthenticated,
  meta: ZodAuthenticationMeta,
})

export type SessionResponse = z.infer<typeof ZodSessionResponse>
