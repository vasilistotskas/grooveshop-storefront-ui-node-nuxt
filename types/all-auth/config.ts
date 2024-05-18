import { z } from 'zod'

const ZodAccountConfiguration = z.object({
  authentication_method: z.enum(['email', 'username', 'username_email']).describe('Enum: "email" "username" "username_email"'),
}).describe('Configuration of the Django allauth.account app')

const ZodProvider = z.object({
  id: z.string().describe('The provider ID.'),
  name: z.string().describe('The name of the provider.'),
  client_id: z.string().optional().describe('The client ID (in case of OAuth2 or OpenID Connect based providers).'),
  flows: z.array(z.enum(['provider_redirect', 'provider_token'])).describe('Items Enum: "provider_redirect" "provider_token"\n'
  + 'The authentication flows the provider integration supports.'),
})

const ZodSocialAccountConfiguration = z.object({
  providers: z.array(ZodProvider),
}).optional().describe('Configuration of the Django allauth.socialaccount app.')

const ZodMFAConfiguration = z.object({
  supported_types: z.array(z.enum(['recovery_codes', 'totp'])).describe('Items Enum: "recovery_codes" "totp"\n'
  + 'Matches settings.MFA_SUPPORTED_TYPES.'),
}).optional().describe('Configuration of the Django allauth.mfa app.')

const ZodUserSessionsConfiguration = z.object({
  track_activity: z.boolean(),
}).optional().describe('Configuration of the Django allauth.usersessions app.')

const ZodData = z.object({
  account: ZodAccountConfiguration,
  socialaccount: ZodSocialAccountConfiguration,
  mfa: ZodMFAConfiguration,
  usersessions: ZodUserSessionsConfiguration,
})

export const ZodConfigResponse = z.object({
  status: z.number(),
  data: ZodData,
})

export type ConfigResponse = z.infer<typeof ZodConfigResponse>
