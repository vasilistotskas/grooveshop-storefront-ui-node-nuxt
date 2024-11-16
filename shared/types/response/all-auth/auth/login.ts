import type * as z from 'zod'

export type LoginResponse = z.infer<typeof ZodLoginResponse>
