import type * as z from 'zod'

export type WebAuthnCredentialCreationOptions = z.infer<typeof ZodWebAuthnCredentialCreationOptions>
