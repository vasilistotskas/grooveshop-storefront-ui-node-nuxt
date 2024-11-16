import type * as z from 'zod'

export type InvalidSessionResponse = z.infer<typeof ZodInvalidSessionResponse>
