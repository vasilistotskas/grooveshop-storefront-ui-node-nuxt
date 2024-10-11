import { object, string, literal, enum as zEnum } from 'zod'
import { ZodAuthenticationMeta, ZodProviderToken, ZodAuthenticated } from '~/types/all-auth'

export const ZodProviderTokenBody = object({
  provider: string().describe('The provider ID.'),
  process: zEnum(['login', 'connect']).describe(
    'Enum: "login" "connect"\nThe process to be executed when the user successfully authenticates. When set to login, the user will be logged into the account to which the provider account is connected, or if no such account exists, a signup will occur. If set to connect, the provider account will be connected to the list of provider accounts for the currently authenticated user.',
  ),
  token: ZodProviderToken,
})

export const ZodProviderTokenResponse = object({
  status: literal(200),
  data: ZodAuthenticated,
  meta: ZodAuthenticationMeta,
})

export type ProviderTokenBody = typeof ZodProviderTokenBody._type
export type ProviderTokenResponse = typeof ZodProviderTokenResponse._type
