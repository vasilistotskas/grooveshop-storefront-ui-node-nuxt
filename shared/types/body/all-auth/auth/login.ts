import type * as z from 'zod'

export type LoginBody = z.infer<typeof ZodLoginBody>
