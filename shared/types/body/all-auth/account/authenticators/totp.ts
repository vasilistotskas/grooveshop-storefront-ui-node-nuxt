import type * as z from 'zod'

export type TotpPostBody = z.infer<typeof ZodTotpPostBody>
