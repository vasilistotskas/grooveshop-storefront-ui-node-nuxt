import type * as z from 'zod'

export type ConflictResponse = z.infer<typeof ZodConflictResponse>
