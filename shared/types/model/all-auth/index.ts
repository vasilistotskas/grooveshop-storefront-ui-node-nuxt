import type * as z from 'zod'

export type AuthenticatorTypeKeys = keyof typeof AuthenticatorType
export type AuthenticatorTypeValues = (typeof AuthenticatorType)[AuthenticatorTypeKeys]
export type AuthInfo = {
  isAuthenticated: boolean
  requiresReauthentication: boolean
  user: AllAuthResponse['data']['user'] | null
  pendingFlow: Flow | null
}
export type FlowId = keyof typeof Flow2path
export type FlowPathValue = (typeof Flow2path)[keyof typeof Flow2path]
export type AuthChangeEventType = typeof AuthChangeEvent[keyof typeof AuthChangeEvent] | null

export type Provider = z.infer<typeof ZodProvider>
export type Methods = z.infer<typeof ZodMethods>
export type User = z.infer<typeof ZodUser>
export type AuthenticationMeta = z.infer<typeof ZodAuthenticationMeta>
export type UnauthenticatedMeta = z.infer<typeof ZodUnauthenticatedMeta>
export type ProviderToken = z.infer<typeof ZodProviderToken>
export type Session = z.infer<typeof ZodSession>
export type Flow = z.infer<typeof ZodFlow>
export type Authenticated = z.infer<typeof ZodAuthenticated>
export type TOTPAuthenticator = z.infer<typeof ZodTOTPAuthenticator>
export type EmailAddress = z.infer<typeof ZodEmailAddress>
export type ProviderAccount = z.infer<typeof ZodProviderAccount>
