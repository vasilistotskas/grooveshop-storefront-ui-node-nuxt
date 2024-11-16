import type * as z from 'zod'

export type TwoFaReauthenticateBody = z.infer<typeof ZodTwoFaReauthenticateBody>
