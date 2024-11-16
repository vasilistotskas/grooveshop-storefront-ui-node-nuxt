import * as z from 'zod'

export const ZodProvidersDeleteResponse = z.object({
  status: z.literal(200),
  data: z.array(ZodProviderAccount),
})

export const ZodProvidersGetResponse = z.object({
  status: z.literal(200),
  data: z.array(ZodProviderAccount),
})
