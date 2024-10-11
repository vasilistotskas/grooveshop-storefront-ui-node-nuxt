import { object, string, literal, record, any, optional } from 'zod'
import { ZodAuthenticated, ZodAuthenticationMeta } from '~/types/all-auth'

export const ZodWebAuthnAuthenticateGetResponse = object({
  status: literal(200),
  data: object({
    request_options: object({
      publicKey: record(any()),
    }),
  }),
})

export const ZodWebAuthnAuthenticatePostResponse = object({
  status: literal(200),
  data: ZodAuthenticated,
  meta: ZodAuthenticationMeta,
})

export const ZodWebAuthnAuthenticatePostBody = object({
  credential: object({
    type: string(),
    id: string(),
    rawId: any(),
    response: any(),
    authenticatorAttachment: string().nullish(),
    clientExtensionResults: optional(any()),
  }),
})

export const ZodWebAuthnReauthenticateGetResponse = object({
  status: literal(200),
  data: object({
    request_options: object({
      publicKey: record(any()),
    }),
  }),
})

export const ZodWebAuthnReauthenticatePostBody = object({
  credential: object({
    type: string(),
    id: string(),
    rawId: any(),
    response: any(),
    authenticatorAttachment: string().nullish(),
    clientExtensionResults: optional(any()),
  }),
})

export const ZodWebAuthnReauthenticatePostResponse = object({
  status: literal(200),
  data: ZodAuthenticated,
  meta: ZodAuthenticationMeta,
})

export const ZodWebAuthnLoginGetResponse = object({
  status: literal(200),
  data: object({
    request_options: object({
      publicKey: record(any()),
    }),
  }),
  meta: ZodAuthenticationMeta,
})

export const ZodWebAuthnLoginPostBody = object({
  credential: object({
    type: string(),
    id: string(),
    rawId: any(),
    response: any(),
    authenticatorAttachment: string().nullish(),
    clientExtensionResults: optional(any()),
  }),
})

export const ZodWebAuthnLoginPostResponse = object({
  status: literal(200),
  data: ZodAuthenticated,
  meta: ZodAuthenticationMeta,
})

export const ZodWebAuthnSignupGetResponse = object({
  status: literal(200),
  data: object({
    creation_options: object({
      publicKey: record(any()),
    }),
  }),
})

export const ZodWebAuthnSignupPostResponse = any()

export const ZodWebAuthnSignupPostBody = object({
  email: string(),
  username: optional(string()),
})

export const ZodWebAuthnSignupPutResponse = object({
  status: literal(200),
  data: ZodAuthenticated,
  meta: ZodAuthenticationMeta,
})

export const ZodWebAuthnSignupPutBody = object({
  name: string(),
  credential: object({
    type: string(),
    id: string(),
    rawId: any(),
    authenticatorAttachment: string().nullish(),
    response: any(),
    clientExtensionResults: optional(any()),
  }),
})

export type WebAuthnAuthenticateGetResponse = typeof ZodWebAuthnAuthenticateGetResponse._type
export type WebAuthnAuthenticatePostResponse = typeof ZodWebAuthnAuthenticatePostResponse._type
export type WebAuthnAuthenticatePostBody = typeof ZodWebAuthnAuthenticatePostBody._type
export type WebAuthnReauthenticateGetResponse = typeof ZodWebAuthnReauthenticateGetResponse._type
export type WebAuthnReauthenticatePostBody = typeof ZodWebAuthnReauthenticatePostBody._type
export type WebAuthnReauthenticatePostResponse = typeof ZodWebAuthnReauthenticatePostResponse._type
export type WebAuthnLoginGetResponse = typeof ZodWebAuthnLoginGetResponse._type
export type WebAuthnLoginPostBody = typeof ZodWebAuthnLoginPostBody._type
export type WebAuthnLoginPostResponse = typeof ZodWebAuthnLoginPostResponse._type
export type WebAuthnSignupGetResponse = typeof ZodWebAuthnSignupGetResponse._type
export type WebAuthnSignupPostResponse = typeof ZodWebAuthnSignupPostResponse._type
export type WebAuthnSignupPostBody = typeof ZodWebAuthnSignupPostBody._type
export type WebAuthnSignupPutResponse = typeof ZodWebAuthnSignupPutResponse._type
export type WebAuthnSignupPutBody = typeof ZodWebAuthnSignupPutBody._type
