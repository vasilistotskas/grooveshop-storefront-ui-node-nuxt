import { object, string, number, literal, boolean, array, any, record, optional } from 'zod'
import { ZodAuthenticator } from '~/types/all-auth'

export const ZodWebAuthnCredentialCreationOptions = object({
  creation_options: object({
    publicKey: record(any()),
  }),
})

export const ZodWebAuthnGetResponse = object({
  status: literal(200),
  data: ZodWebAuthnCredentialCreationOptions,
})

export const ZodWebAuthnDeleteBody = object({
  authenticators: array(number()),
})

export const ZodWebAuthnDeleteResponse = object({
  status: literal(200),
})

export const ZodWebAuthnPostBody = object({
  name: string(),
  credential: object({
    type: string(),
    id: string(),
    rawId: any(),
    response: any(),
    authenticatorAttachment: string().nullish(),
    clientExtensionResults: optional(any()),
  }),
})

export const ZodWebAuthnPostResponse = object({
  status: literal(200),
  data: ZodAuthenticator,
  meta: object({
    recovery_codes_generated: boolean(),
  }),
})

export const ZodWebAuthnPutBody = object({
  id: number(),
  name: string(),
})

export const ZodWebAuthnPutResponse = object({
  status: literal(200),
  data: ZodAuthenticator,
})

export type WebAuthnGetResponse = typeof ZodWebAuthnGetResponse._type
export type WebAuthnDeleteBody = typeof ZodWebAuthnDeleteBody._type
export type WebAuthnDeleteResponse = typeof ZodWebAuthnDeleteResponse._type
export type WebAuthnPostBody = typeof ZodWebAuthnPostBody._type
export type WebAuthnPostResponse = typeof ZodWebAuthnPostResponse._type
export type WebAuthnPutBody = typeof ZodWebAuthnPutBody._type
export type WebAuthnPutResponse = typeof ZodWebAuthnPutResponse._type
