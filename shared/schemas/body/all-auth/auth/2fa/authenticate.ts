import * as z from 'zod'

export const ZodTwoFaAuthenticateBody = z.object({
  code: z.string().describe('An authenticator code.'),
})
