import type * as z from 'zod'

export type AuthenticatorsResponse = z.infer<typeof ZodAuthenticatorsResponse>
