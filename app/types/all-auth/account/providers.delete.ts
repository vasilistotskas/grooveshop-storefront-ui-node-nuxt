import * as z from 'zod'
import { ZodProviderAccount } from '~/types/all-auth'

const ZodData = z.array(ZodProviderAccount)

export const ZodProvidersDeleteBody = z.object({
  provider: z.string().describe('The provider ID.'),
  account: z.string().describe('The provider specific account ID.'),
})

export const ZodProvidersDeleteResponse = z.object({
  status: z.literal(200),
  data: ZodData,
})

export type ProvidersDeleteBody = z.infer<typeof ZodProvidersDeleteBody>
export type ProvidersDeleteResponse = z.infer<typeof ZodProvidersDeleteResponse>
