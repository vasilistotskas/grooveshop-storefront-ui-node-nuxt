import type * as z from 'zod'

export type PasswordChangeBody = z.infer<typeof ZodPasswordChangeBody>
