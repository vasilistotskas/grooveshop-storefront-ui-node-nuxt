import type * as z from 'zod'

export type WebAuthnGetResponse = z.infer<typeof ZodWebAuthnGetResponse>
export type WebAuthnDeleteResponse = z.infer<typeof ZodWebAuthnDeleteResponse>
export type WebAuthnPostResponse = z.infer<typeof ZodWebAuthnPostResponse>
export type WebAuthnPutResponse = z.infer<typeof ZodWebAuthnPutResponse>
