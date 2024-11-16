import type * as z from 'zod'

export type CodeRequestBody = z.infer<typeof ZodCodeRequestBody>
