import type * as z from 'zod'

export type PasswordRequestBody = z.infer<typeof ZodPasswordRequestBody>
