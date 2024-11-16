import * as z from 'zod'

const ZodTagTranslations = z.record(
  z.object({
    label: z.string().nullish(),
  }),
)

export const ZodTag = z.object({
  translations: ZodTagTranslations,
  id: z.number(),
  active: z.boolean(),
}).merge(ZodUUIDModel).merge(ZodTimeStampModel).merge(ZodSortableModel)
