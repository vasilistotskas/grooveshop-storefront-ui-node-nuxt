import type * as z from 'zod'

export type WebAuthnAuthenticateGetResponse = z.infer<typeof ZodWebAuthnAuthenticateGetResponse>
export type WebAuthnAuthenticatePostResponse = z.infer<typeof ZodWebAuthnAuthenticatePostResponse>
export type WebAuthnReauthenticateGetResponse = z.infer<typeof ZodWebAuthnReauthenticateGetResponse>
export type WebAuthnReauthenticatePostResponse = z.infer<typeof ZodWebAuthnReauthenticatePostResponse>
export type WebAuthnLoginGetResponse = z.infer<typeof ZodWebAuthnLoginGetResponse>
export type WebAuthnLoginPostResponse = z.infer<typeof ZodWebAuthnLoginPostResponse>
export type WebAuthnSignupGetResponse = z.infer<typeof ZodWebAuthnSignupGetResponse>
export type WebAuthnSignupPostResponse = z.infer<typeof ZodWebAuthnSignupPostResponse>
export type WebAuthnSignupPutResponse = z.infer<typeof ZodWebAuthnSignupPutResponse>
