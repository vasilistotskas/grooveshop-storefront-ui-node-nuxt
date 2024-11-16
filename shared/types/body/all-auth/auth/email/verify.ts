import type * as z from 'zod'

export type EmailVerifyPostBody = z.infer<typeof ZodEmailVerifyPostBody>
