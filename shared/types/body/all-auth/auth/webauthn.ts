import type * as z from 'zod'

export type WebAuthnAuthenticatePostBody = z.infer<typeof ZodWebAuthnAuthenticatePostBody>
export type WebAuthnReauthenticatePostBody = z.infer<typeof ZodWebAuthnReauthenticatePostBody>
export type WebAuthnLoginPostBody = z.infer<typeof ZodWebAuthnLoginPostBody>
export type WebAuthnSignupPostBody = z.infer<typeof ZodWebAuthnSignupPostBody>
export type WebAuthnSignupPutBody = z.infer<typeof ZodWebAuthnSignupPutBody>
