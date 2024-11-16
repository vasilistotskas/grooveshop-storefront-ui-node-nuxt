import type * as z from 'zod'

export type ForbiddenResponse = z.infer<typeof ZodForbiddenResponse>
