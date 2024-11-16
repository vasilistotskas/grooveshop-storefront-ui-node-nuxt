import type * as z from 'zod'

export type TwoFaReauthenticateResponse = z.infer<typeof ZodTwoFaReauthenticateResponse>
