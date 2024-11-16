import type * as z from 'zod'

export type ProviderTokenBody = z.infer<typeof ZodProviderTokenBody>
