import type * as z from 'zod'

export type ProviderSignupBody = z.infer<typeof ZodProviderSignupBody>
