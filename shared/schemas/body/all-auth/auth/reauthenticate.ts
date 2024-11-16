import * as z from 'zod'

export const ZodReauthenticateBody = z.object({
  password: z.string().describe('The password.'),
})
