import type * as z from 'zod'

export type BadResponse = z.infer<typeof ZodBadResponse>
