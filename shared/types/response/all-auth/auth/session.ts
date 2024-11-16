import type * as z from 'zod'

export type SessionResponse = z.infer<typeof ZodSessionResponse>
