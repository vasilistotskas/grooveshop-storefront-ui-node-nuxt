import { object, string, enum as zEnum } from 'zod'

export const ZodProviderRedirectBody = object({
  provider: string().describe('The provider ID.'),
  callback_url: string().describe('The URL to return to after the redirect flow is complete.'),
  process: zEnum(['login', 'connect']).describe(
    'Enum: "login" "connect"\nThe process to be executed when the user successfully authenticates. When set to login, the user will be logged into the account to which the provider account is connected, or if no such account exists, a signup will occur. If set to connect, the provider account will be connected to the list of provider accounts for the currently authenticated user.',
  ),
})

export type ProviderRedirectBody = typeof ZodProviderRedirectBody._type
