import type * as z from 'zod'

export type AuthenticatorTypeKeys = keyof typeof AuthenticatorType
export type AuthenticatorTypeValues = (typeof AuthenticatorType)[AuthenticatorTypeKeys]
export type AuthInfo = {
  isAuthenticated: boolean
  requiresReauthentication: boolean
  user: AllAuthResponse['data']['user'] | null
  pendingFlow: Flow | null
}
export type FlowPathValue = (typeof Flow2path)[keyof typeof Flow2path]
export type AuthChangeEventType = typeof AuthChangeEvent[keyof typeof AuthChangeEvent] | null

export type Provider = z.infer<typeof ZodProvider>
export type ProviderToken = z.infer<typeof ZodProviderToken>
export type Session = z.infer<typeof ZodSession>
export type Flow = z.infer<typeof ZodFlow>
export type EmailAddress = z.infer<typeof ZodEmailAddress>
