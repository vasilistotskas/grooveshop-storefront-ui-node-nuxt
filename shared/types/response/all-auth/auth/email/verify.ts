import type * as z from 'zod'

export type EmailVerifyPostResponse = z.infer<typeof ZodEmailVerifyPostResponse>
export type EmailVerifyGetResponse = z.infer<typeof ZodEmailVerifyGetResponse>
