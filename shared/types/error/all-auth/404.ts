import type * as z from 'zod'

export type NotFoundResponse = z.infer<typeof ZodNotFoundResponse>
