import type * as z from 'zod'

export type PasswordRequestResponse = z.infer<typeof ZodPasswordRequestResponse>
