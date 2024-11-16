import * as z from 'zod'

export const ZodTwoFaReauthenticateBody = z.object({
  code: z.string().describe('An authenticator code.'),
})
