import type * as z from 'zod'

export type SignupResponse = z.infer<typeof ZodSignupResponse>
