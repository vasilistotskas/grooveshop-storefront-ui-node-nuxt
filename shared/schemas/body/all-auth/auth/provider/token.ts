import * as z from 'zod'

export const ZodProviderTokenBody = z.object({
  provider: z.string().describe('The provider ID.'),
  process: z.enum(['login', 'connect']).describe('Enum: "login" "connect"\n'
    + 'The process to be executed when the user successfully authenticates. When set to login, the user will be logged into the account to which the provider account is connected, or if no such account exists, a signup will occur. If set to connect, the provider account will be connected to the list of provider accounts for the currently authenticated user.'),
  token: ZodProviderToken,
})
