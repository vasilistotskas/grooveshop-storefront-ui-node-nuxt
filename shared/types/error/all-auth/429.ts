import type * as z from 'zod'

export type TooManyRequestsResponse = z.infer<typeof ZodTooManyRequestsResponse>
