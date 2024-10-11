import { array, object, literal } from 'zod'
import { ZodProviderAccount } from '~/types/all-auth'

const ZodData = array(ZodProviderAccount)

export const ZodProvidersGetResponse = object({
  status: literal(200),
  data: ZodData,
})

export type ProvidersGetResponse = typeof ZodProvidersGetResponse._type
