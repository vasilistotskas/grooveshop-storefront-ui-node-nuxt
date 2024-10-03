import { z } from 'zod'
import { ZodAuthenticator } from '~/types/all-auth'

export const ZodWebAuthnCredentialCreationOptions = z.object({
  creation_options: z.object({
    publicKey: z.record(z.any()),
  }),
})

export const ZodWebAuthnGetResponse = z.object({
  status: z.literal(200),
  data: ZodWebAuthnCredentialCreationOptions,
})

export const ZodWebAuthnDeleteBody = z.object({
  authenticators: z.array(z.number()),
})

export const ZodWebAuthnDeleteResponse = z.object({
  status: z.literal(200),
})

export const ZodWebAuthnPostBody = z.object({
  name: z.string(),
  credential: z.object({
    type: z.string(),
    id: z.string(),
    rawId: z.any(),
    response: z.any(),
    authenticatorAttachment: z.string().nullish(),
    clientExtensionResults: z.any().optional(),
  }),
})

export const ZodWebAuthnPostResponse = z.object({
  status: z.literal(200),
  data: ZodAuthenticator,
  meta: z.object({
    recovery_codes_generated: z.boolean(),
  }),
})

export const ZodWebAuthnPutBody = z.object({
  id: z.number(),
  name: z.string(),
})

export const ZodWebAuthnPutResponse = z.object({
  status: z.literal(200),
  data: ZodAuthenticator,
})

export type WebAuthnGetResponse = z.infer<typeof ZodWebAuthnGetResponse>
export type WebAuthnDeleteBody = z.infer<typeof ZodWebAuthnDeleteBody>
export type WebAuthnDeleteResponse = z.infer<typeof ZodWebAuthnDeleteResponse>
export type WebAuthnPostBody = z.infer<typeof ZodWebAuthnPostBody>
export type WebAuthnPostResponse = z.infer<typeof ZodWebAuthnPostResponse>
export type WebAuthnPutBody = z.infer<typeof ZodWebAuthnPutBody>
export type WebAuthnPutResponse = z.infer<typeof ZodWebAuthnPutResponse>
