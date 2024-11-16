import type * as z from 'zod'

export type WebAuthnDeleteBody = z.infer<typeof ZodWebAuthnDeleteBody>
export type WebAuthnPostBody = z.infer<typeof ZodWebAuthnPostBody>
export type WebAuthnPutBody = z.infer<typeof ZodWebAuthnPutBody>
