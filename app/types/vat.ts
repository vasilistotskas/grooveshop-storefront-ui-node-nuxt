import { object, number } from 'zod'
import { ZodTimeStampModel, ZodUUIDModel } from '~/types/index'

export const ZodVat = object({
  id: number().int(),
  value: number(),
})
  .merge(ZodUUIDModel)
  .merge(ZodTimeStampModel)

export type Vat = typeof ZodVat._type
