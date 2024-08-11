import { z } from 'zod'
import { ZodProvider } from '~/types/all-auth'

const ZodAccountConfiguration = z.object({
  authentication_method: z.enum(['email', 'username', 'username_email']).describe('Enum: "email" "username" "username_email"'),
  is_open_for_signup: z.boolean(),
}).describe('Configuration of the Django allauth.account app')

const ZodSocialAccountConfiguration = z.object({
  providers: z.array(ZodProvider),
}).optional().describe('Configuration of the Django allauth.socialaccount app.')

const ZodMFAConfiguration = z.object({
  supported_types: z.array(z.enum(['recovery_codes', 'totp', 'webauthn'])).describe('Items Enum: "recovery_codes" "totp"\n'
  + 'Matches settings.MFA_SUPPORTED_TYPES.'),
  passkey_login_enabled: z.boolean().optional().describe('Matches settings.MFA_PASSKEY_LOGIN_ENABLED.'),
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
  status: z.literal(200),
  data: ZodData,
})

export type ConfigResponse = z.infer<typeof ZodConfigResponse>
