import { z } from 'zod'
import { ZodAuthenticated, ZodAuthenticationMeta } from '~/types/all-auth'

export const ZodWebAuthnAuthenticateGetResponse = z.object({
  status: z.literal(200),
  data: z.object({
    request_options: z.object({
      publicKey: z.any(),
    }),
  }),
})

export const ZodWebAuthnAuthenticatePostResponse = z.object({
  status: z.literal(200),
  data: ZodAuthenticated,
  meta: ZodAuthenticationMeta,
})

export const ZodWebAuthnAuthenticatePostBody = z.object({
  credential: z.object({
    type: z.string(),
    id: z.string(),
    rawId: z.any(),
    response: z.any(),
    authenticatorAttachment: z.string().nullish(),
    clientExtensionResults: z.any().optional(),
  }),
})

export const ZodWebAuthnReauthenticateGetResponse = z.object({
  status: z.literal(200),
  data: z.object({
    request_options: z.object({
      publicKey: z.any(),
    }),
  }),
})

export const ZodWebAuthnReauthenticatePostBody = z.object({
  credential: z.object({
    type: z.string(),
    id: z.string(),
    rawId: z.any(),
    response: z.any(),
    authenticatorAttachment: z.string().nullish(),
    clientExtensionResults: z.any().optional(),
  }),
})

export const ZodWebAuthnReauthenticatePostResponse = z.object({
  status: z.literal(200),
  data: ZodAuthenticated,
  meta: ZodAuthenticationMeta,
})

export const ZodWebAuthnLoginGetResponse = z.object({
  status: z.literal(200),
  data: z.object({
    request_options: z.object({
      publicKey: z.any(),
    }),
  }),
  meta: ZodAuthenticationMeta,
})

export const ZodWebAuthnLoginPostBody = z.object({
  credential: z.object({
    type: z.string(),
    id: z.string(),
    rawId: z.any(),
    response: z.any(),
    authenticatorAttachment: z.string().nullish(),
    clientExtensionResults: z.any().optional(),
  }),
})

export const ZodWebAuthnLoginPostResponse = z.object({
  status: z.literal(200),
  data: ZodAuthenticated,
  meta: ZodAuthenticationMeta,
})

export type WebAuthnAuthenticateGetResponse = z.infer<typeof ZodWebAuthnAuthenticateGetResponse>
export type WebAuthnAuthenticatePostResponse = z.infer<typeof ZodWebAuthnAuthenticatePostResponse>
export type WebAuthnAuthenticatePostBody = z.infer<typeof ZodWebAuthnAuthenticatePostBody>
export type WebAuthnReauthenticateGetResponse = z.infer<typeof ZodWebAuthnReauthenticateGetResponse>
export type WebAuthnReauthenticatePostBody = z.infer<typeof ZodWebAuthnReauthenticatePostBody>
export type WebAuthnReauthenticatePostResponse = z.infer<typeof ZodWebAuthnReauthenticatePostResponse>
export type WebAuthnLoginGetResponse = z.infer<typeof ZodWebAuthnLoginGetResponse>
export type WebAuthnLoginPostBody = z.infer<typeof ZodWebAuthnLoginPostBody>
export type WebAuthnLoginPostResponse = z.infer<typeof ZodWebAuthnLoginPostResponse>
