import { array, object, string, literal } from 'zod'
import { ZodProviderAccount } from '~/types/all-auth'

const ZodData = array(ZodProviderAccount)

export const ZodProvidersDeleteBody = object({
  provider: string().describe('The provider ID.'),
  account: string().describe('The provider specific account ID.'),
})

export const ZodProvidersDeleteResponse = object({
  status: literal(200),
  data: ZodData,
})

export type ProvidersDeleteBody = typeof ZodProvidersDeleteBody._type
export type ProvidersDeleteResponse = typeof ZodProvidersDeleteResponse._type
