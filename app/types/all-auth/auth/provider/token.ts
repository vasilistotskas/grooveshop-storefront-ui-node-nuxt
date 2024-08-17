import { z } from 'zod'
import { ZodAuthenticationMeta, ZodProviderToken, ZodAuthenticated } from '~/types/all-auth'

export const ZodProviderTokenBody = z.object({
  provider: z.string().describe('The provider ID.'),
  process: z.enum(['login', 'connect']).describe('Enum: "login" "connect"\n'
  + 'The process to be executed when the user successfully authenticates. When set to login, the user will be logged into the account to which the provider account is connected, or if no such account exists, a signup will occur. If set to connect, the provider account will be connected to the list of provider accounts for the currently authenticated user.'),
  token: ZodProviderToken,
})

export const ZodProviderTokenResponse = z.object({
  status: z.literal(200),
  data: ZodAuthenticated,
  meta: ZodAuthenticationMeta,
})

export type ProviderTokenBody = z.infer<typeof ZodProviderTokenBody>
export type ProviderTokenResponse = z.infer<typeof ZodProviderTokenResponse>
