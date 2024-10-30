import * as z from 'zod'
import { ZodProviderAccount } from '~/types/all-auth'

const ZodData = z.array(ZodProviderAccount)

export const ZodProvidersGetResponse = z.object({
  status: z.literal(200),
  data: ZodData,
})

export type ProvidersGetResponse = z.infer<typeof ZodProvidersGetResponse>
