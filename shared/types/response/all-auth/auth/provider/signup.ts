import type * as z from 'zod'

export type ProviderSignupResponse = z.infer<typeof ZodProviderSignupResponse>
