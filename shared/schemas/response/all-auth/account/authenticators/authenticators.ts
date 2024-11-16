import * as z from 'zod'

export const ZodAuthenticatorsResponse = z.object({
  status: z.literal(200),
  data: z.array(ZodAuthenticator),
})
