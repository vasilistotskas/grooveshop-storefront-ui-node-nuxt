import { z } from 'zod'

const ZodTagTranslations = z.record(
  z.object({
    label: z.string().nullish(),
  }),
)

export const ZodTag = z.object({
  translations: ZodTagTranslations,
  id: z.number(),
  active: z.boolean(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  sortOrder: z.number().nullish(),
  uuid: z.string().uuid(),
})

export type Tag = z.infer<typeof ZodTag>
