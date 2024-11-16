import type * as z from 'zod'

export type Region = z.infer<typeof ZodRegion>
