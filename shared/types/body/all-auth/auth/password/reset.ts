import type * as z from 'zod'

export type PasswordResetPostBody = z.infer<typeof ZodPasswordResetPostBody>
