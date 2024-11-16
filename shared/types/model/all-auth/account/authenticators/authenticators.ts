import type * as z from 'zod'

export type Authenticator = z.infer<typeof ZodAuthenticator>
