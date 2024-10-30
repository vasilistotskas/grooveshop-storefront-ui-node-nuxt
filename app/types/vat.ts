import * as z from 'zod'
import { ZodTimeStampModel, ZodUUIDModel } from '~/types/index'

export const ZodVat = z.object({
  id: z.number().int(),
  value: z.number(),
}).merge(ZodUUIDModel).merge(ZodTimeStampModel)

export type Vat = z.infer<typeof ZodVat>
