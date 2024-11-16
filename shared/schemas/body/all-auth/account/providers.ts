import * as z from 'zod'

export const ZodProvidersDeleteBody = z.object({
  provider: z.string().describe('The provider ID.'),
  account: z.string().describe('The provider specific account ID.'),
})
