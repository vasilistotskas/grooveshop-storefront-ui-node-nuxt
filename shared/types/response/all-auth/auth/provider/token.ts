import type * as z from 'zod'

export type ProviderTokenResponse = z.infer<typeof ZodProviderTokenResponse>
