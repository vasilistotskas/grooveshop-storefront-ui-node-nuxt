import * as z from 'zod'
import { ZodAuthenticationMeta, ZodAuthenticated } from '~/types/all-auth'

export const ZodAllAuthResponse = z.object({
  status: z.literal(200),
  data: ZodAuthenticated,
  meta: ZodAuthenticationMeta.optional(),
})

export type AllAuthResponse = z.infer<typeof ZodAllAuthResponse>
