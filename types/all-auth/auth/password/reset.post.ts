import { z } from 'zod'
import { ZodAuthenticationMeta, ZodMethods, ZodUser } from '~/types/all-auth'

const ZodAuthenticated = z.object({
  user: ZodUser,
  methods: ZodMethods,
})

export const ZodPasswordResetPostBody = z.object({
  key: z.string(),
  email: z.string().email(),
})

export const ZodPasswordResetPostResponse = z.object({
  status: z.literal(200),
  data: ZodAuthenticated,
  meta: ZodAuthenticationMeta,
})

export type PasswordResetPostResponse = z.infer<typeof ZodPasswordResetPostResponse>
export type PasswordResetPostBody = z.infer<typeof ZodPasswordResetPostBody>
