import * as z from 'zod'

export const ZodProvider = z.object({
  id: z.string().describe('The provider ID.'),
  name: z.string().describe('The name of the provider.'),
  client_id: z.string().optional().describe('The client ID (in case of OAuth2 or OpenID Connect based providers).'),
  flows: z.array(z.enum(['provider_redirect', 'provider_token'])).describe('Items Enum: "provider_redirect" "provider_token"\n'
    + 'The authentication flows the provider integration supports.'),
})

export const ZodMethods = z.array(
  z.object({
    method: z.enum(['password', 'socialaccount', 'mfa', 'code']),
    at: z.number().describe('An epoch based timestamp (trivial to parse using: new Date(value)*1000)'),
    email: z.string().email().optional().describe('The email address.'),
    username: z.string().optional().describe('The username.'),
    reauthenticated: z.boolean().optional(),
    provider: z.string().optional().describe('The provider ID.'),
    uid: z.string().optional().describe('The provider specific account ID.'),
    type: z.string().optional().describe('Enum: "recovery_codes" "totp"\n'
      + 'The type of authenticator.'),
  }),
).describe('A list of methods used to authenticate.')

export const ZodUser = z.object({
  id: z.union([z.string(), z.number()]).describe('The user ID.'),
  display: z.string().optional().describe('The display name for the user.'),
  has_usable_password: z.boolean().optional().describe('Whether or not the account has a password set.'),
  email: z.string().email().optional().describe('The email address.'),
  username: z.string().optional().describe('The username.'),
})

export const ZodAuthenticationMeta = z.object({
  session_token: z.string().optional().describe('The session token (app clients only).'),
  access_token: z.string().optional().describe('The access token (app clients only).'),
  is_authenticated: z.boolean().optional(),
}).describe('Metadata available in an authentication related response.')

export const ZodUnauthenticatedMeta = z.object({
  session_token: z.string().optional().describe('The session token (app clients only).'),
  access_token: z.string().optional().describe('The access token (app clients only).'),
  is_authenticated: z.boolean().nullable(),
}).describe('Metadata available in an unauthenticated response.')

export const ZodProviderToken = z.object({
  client_id: z.string().describe('The client ID (in case of OAuth2 or OpenID Connect based providers)'),
  id_token: z.string().optional().describe('The ID token.'),
  access_token: z.string().optional().describe('The access token.'),
})

export const ZodSession = z.object({
  user_agent: z.string(),
  ip: z.string(),
  created_at: z.number(),
  is_current: z.boolean(),
  id: z.number(),
  last_seen_at: z.number().optional(),
})

export const ZodFlow = z.object({
  id: z.enum([
    'verify_email',
    'login',
    'login_by_code',
    'signup',
    'provider_redirect',
    'provider_signup',
    'provider_token',
    'reauthenticate',
    'mfa_reauthenticate',
    'mfa_authenticate',
    'mfa_login_webauthn',
    'mfa_reauthenticate_webauthn',
    'mfa_signup_webauthn',
  ]),
  provider: ZodProvider.optional(),
  is_pending: z.boolean().optional(),
  types: z.array(z.enum(['totp', 'recovery_codes', 'webauthn'])).optional(),
})

export const ZodAuthenticated = z.object({
  user: ZodUser,
  methods: ZodMethods,
  flows: z.array(ZodFlow).optional(),
})

export const ZodTOTPAuthenticator = z.object({
  last_used_at: z.number().nullable().describe('An epoch based timestamp (trivial to parse using: new Date(value)*1000)'),
  created_at: z.number().describe('An epoch based timestamp (trivial to parse using: new Date(value)*1000)'),
  type: z.literal('totp'),
})

export const ZodEmailAddress = z.object({
  email: z.string().email().describe('The email address.'),
  primary: z.boolean(),
  verified: z.boolean(),
})

export const ZodProviderAccount = z.object({
  uid: z.string().describe('The provider specific account ID.'),
  display: z.string().describe('A name derived from the third-party provider account data.'),
  provider: z.object({
    id: z.string().describe('The provider ID.'),
    name: z.string().describe('The name of the provider.'),
    client_id: z.string().optional().describe('The client ID (in case of OAuth2 or OpenID Connect based providers)'),
    flows: z.array(z.enum(['provider_redirect', 'provider_token'])).describe('Items Enum: "provider_redirect" "provider_token"\n'
      + 'The authentication flows the provider integration supports.'),
  }),
})
