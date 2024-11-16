import type * as z from 'zod'

export type PasswordResetPostResponse = z.infer<typeof ZodPasswordResetPostResponse>
export type PasswordResetGetResponse = z.infer<typeof ZodPasswordResetGetResponse>
