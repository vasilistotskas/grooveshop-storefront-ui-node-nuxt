import type * as z from 'zod'

export type Tag = z.infer<typeof ZodTag>
