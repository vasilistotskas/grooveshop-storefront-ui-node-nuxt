import type * as z from 'zod'

export type ReauthenticateResponse = z.infer<typeof ZodReauthenticateResponse>
