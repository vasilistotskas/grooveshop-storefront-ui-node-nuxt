import * as z from 'zod'

export const ZodTotpPostBody = z.object({
  code: z.string().describe('An authenticator code.'),
})
