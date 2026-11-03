/**
 * The storefront's own names over allauth's headless document, which
 * Django publishes and `shared/openapi-allauth` generates from. Nothing here
 * restates a shape the document gives: a type is composed from the generated
 * ones, or is a union of them.
 */

/** An authenticated answer: the signed-in account and how it signed in. */
export type AllAuthResponse = AllAuthAuthenticatedResponse

/** Not (fully) signed in: the flows to continue with, and for a reauthentication the account too. */
export type AllAuthNotAuthenticated = AllAuthAuthenticationResponse | AllAuthReauthenticationResponse

/**
 * The session is gone. The document leaves the body an open object; the one
 * thing read from it is the flows it may still offer.
 */
export type AllAuthSessionGone = Omit<AllAuthSessionGoneResponse, 'data'> & {
  data: { flows?: AllAuthFlow[] }
}

/** TOTP setup: the 404 that carries the secret to enrol with. */
export type AllAuthTotpNotFound = GetAllauthAppV1AccountAuthenticatorsTotpErrors[404]

/** allauth's rate limit (signup, login code, email management): the status alone. */
export type AllAuthTooManyRequests = { status: 429 }

/** What allauth answers instead of an `AllAuthResponse`. */
export type AllAuthResponseError
  = AllAuthErrorResponse
    | AllAuthNotAuthenticated
    | AllAuthSessionGone
    | AllAuthForbiddenResponse
    | AllAuthTotpNotFound
    | AllAuthConflictResponse

/** A failed call to allauth as ofetch throws it: the body is on `data`. */
export type AllAuthError = {
  data: AllAuthResponseError | AllAuthTooManyRequests
}

/** The same failure through the storefront proxy, which nests allauth's body once more. */
export type AllAuthClientError = {
  data: {
    data: AllAuthResponseError
  }
}

/** One authenticator of the account: an app, recovery codes or a security key. */
export type AllAuthAuthenticator = AllAuthAuthenticatorList[number]

export type AuthenticatorTypeKeys = keyof typeof AuthenticatorType
export type AuthenticatorTypeValues = (typeof AuthenticatorType)[AuthenticatorTypeKeys]
export type AuthInfo = {
  isAuthenticated: boolean
  requiresReauthentication: boolean
  user: AllAuthResponse['data']['user'] | null
  pendingFlow: AllAuthFlow | null
}
export type FlowPathValue = (typeof Flow2path)[keyof typeof Flow2path]
export type AuthChangeEventType = typeof AuthChangeEvent[keyof typeof AuthChangeEvent] | null
