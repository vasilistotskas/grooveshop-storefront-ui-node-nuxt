import { z } from 'zod'

const ZodMeta = z.object({
  session_token: z.string().optional(),
  access_token: z.string().optional(),
  is_authenticated: z.literal(false).nullable(),
})

export const ZodInvalidSessionResponse = z.object({
  status: z.literal(410),
  data: z.record(z.any()),
  meta: ZodMeta,
})

export type InvalidSessionResponse = z.infer<typeof ZodInvalidSessionResponse>
