import type * as z from 'zod'

export type SignupBody = z.infer<typeof ZodSignupBody>
