import * as z from 'zod'
import { ZodAuthenticationMeta, ZodAuthenticated } from '~/types/all-auth'

export const ZodReauthenticateBody = z.object({
  password: z.string().describe('The password.'),
})

export const ZodReauthenticateResponse = z.object({
  status: z.literal(200),
  data: ZodAuthenticated,
  meta: ZodAuthenticationMeta,
})

export type ReauthenticateBody = z.infer<typeof ZodReauthenticateBody>
export type ReauthenticateResponse = z.infer<typeof ZodReauthenticateResponse>
