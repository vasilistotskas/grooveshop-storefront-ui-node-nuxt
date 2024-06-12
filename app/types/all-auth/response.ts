import { z } from 'zod'
import { ZodFlow, ZodMethods, ZodUser } from '~/types/all-auth'

const ZodAuthenticated = z.object({
  user: ZodUser,
  methods: ZodMethods,
  flows: z.array(ZodFlow).optional(),
})

export const ZodAllAuthResponse = z.object({
  status: z.literal(200),
  data: ZodAuthenticated,
  meta: z.object({
    session_token: z.string().optional(),
    access_token: z.string().optional(),
    is_authenticated: z.boolean().optional(),
  }).optional(),
})

export type AllAuthResponse = z.infer<typeof ZodAllAuthResponse>
