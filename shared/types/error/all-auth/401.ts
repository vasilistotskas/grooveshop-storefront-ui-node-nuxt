import type * as z from 'zod'

export type NotAuthenticatedResponse = z.infer<typeof ZodNotAuthenticatedResponse>
