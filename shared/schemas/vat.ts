import * as z from 'zod'

export const ZodVat = z.object({
  id: z.number().int(),
  value: z.number(),
}).merge(ZodUUIDModel).merge(ZodTimeStampModel)
