import type * as z from 'zod'

export type TwoFaAuthenticateResponse = z.infer<typeof ZodTwoFaAuthenticateResponse>
