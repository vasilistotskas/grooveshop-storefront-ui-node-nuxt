import { z } from 'zod'
import { ZodAuthenticated, ZodAuthenticationMeta } from '~/types/all-auth'

export const ZodWebAuthnAuthenticateGetResponse = z.object({
  status: z.literal(200),
  data: z.object({
    request_options: z.object({
      publicKey: z.record(z.any()),
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
      publicKey: z.record(z.any()),
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
      publicKey: z.record(z.any()),
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

export const ZodWebAuthnSignupGetResponse = z.object({
  status: z.literal(200),
  data: z.object({
    creation_options: z.object({
      publicKey: z.record(z.any()),
    }),
  }),
})

export const ZodWebAuthnSignupPostResponse = z.any()

export const ZodWebAuthnSignupPostBody = z.object({
  email: z.string(),
  username: z.string().optional(),
})

export const ZodWebAuthnSignupPutResponse = z.object({
  status: z.literal(200),
  data: ZodAuthenticated,
  meta: ZodAuthenticationMeta,
})

export const ZodWebAuthnSignupPutBody = z.object({
  name: z.string(),
  credential: z.object({
    type: z.string(),
    id: z.string(),
    rawId: z.any(),
    authenticatorAttachment: z.string().nullish(),
    response: z.any(),
    clientExtensionResults: z.any().optional(),
  }),
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
export type WebAuthnSignupGetResponse = z.infer<typeof ZodWebAuthnSignupGetResponse>
export type WebAuthnSignupPostResponse = z.infer<typeof ZodWebAuthnSignupPostResponse>
export type WebAuthnSignupPostBody = z.infer<typeof ZodWebAuthnSignupPostBody>
export type WebAuthnSignupPutResponse = z.infer<typeof ZodWebAuthnSignupPutResponse>
export type WebAuthnSignupPutBody = z.infer<typeof ZodWebAuthnSignupPutBody>
