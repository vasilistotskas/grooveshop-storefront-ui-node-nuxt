import { literal, object, boolean, array, enum as zEnum, optional } from 'zod'
import { ZodProvider } from '~/types/all-auth'

const ZodAccountConfiguration = object({
  authentication_method: zEnum(['email', 'username', 'username_email']).describe(
    'Enum: "email" "username" "username_email"',
  ),
  is_open_for_signup: boolean(),
}).describe('Configuration of the Django allauth.account app')

const ZodSocialAccountConfiguration = optional(
  object({
    providers: array(ZodProvider),
  }),
).describe('Configuration of the Django allauth.socialaccount app.')

const ZodMFAConfiguration = optional(
  object({
    supported_types: array(
      zEnum(['recovery_codes', 'totp', 'webauthn']),
    ).describe('Items Enum: "recovery_codes" "totp"\nMatches settings.MFA_SUPPORTED_TYPES.'),
    passkey_login_enabled: optional(boolean()).describe(
      'Matches settings.MFA_PASSKEY_LOGIN_ENABLED.',
    ),
  }),
).describe('Configuration of the Django allauth.mfa app.')

const ZodUserSessionsConfiguration = optional(
  object({
    track_activity: boolean(),
  }),
).describe('Configuration of the Django allauth.usersessions app.')

const ZodData = object({
  account: ZodAccountConfiguration,
  socialaccount: ZodSocialAccountConfiguration,
  mfa: ZodMFAConfiguration,
  usersessions: ZodUserSessionsConfiguration,
})

export const ZodConfigResponse = object({
  status: literal(200),
  data: ZodData,
})

export type ConfigResponse = typeof ZodConfigResponse._type
