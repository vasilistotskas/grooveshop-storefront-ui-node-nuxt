import { object, string, number, boolean, record } from 'zod'
import { ZodSortableModel, ZodTimeStampModel, ZodUUIDModel } from '~/types/index'

const ZodTagTranslations = record(
  object({
    label: string().nullish(),
  }),
)

export const ZodTag = object({
  translations: ZodTagTranslations,
  id: number(),
  active: boolean(),
})
  .merge(ZodUUIDModel)
  .merge(ZodTimeStampModel)
  .merge(ZodSortableModel)

export type Tag = typeof ZodTag._type
