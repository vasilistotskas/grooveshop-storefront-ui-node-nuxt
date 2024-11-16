import type * as z from 'zod'

export type CodeConfirmResponse = z.infer<typeof ZodCodeConfirmResponse>
