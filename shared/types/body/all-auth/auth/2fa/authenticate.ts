import type * as z from 'zod'

export type TwoFaAuthenticateBody = z.infer<typeof ZodTwoFaAuthenticateBody>
