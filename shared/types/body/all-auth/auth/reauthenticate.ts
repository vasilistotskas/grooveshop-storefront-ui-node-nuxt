import type * as z from 'zod'

export type ReauthenticateBody = z.infer<typeof ZodReauthenticateBody>
