import { z } from 'zod'
import { ZodOrderingQuery } from '~/types/ordering'
import { ZodPaginationQuery } from '~/types/pagination'

const ZodBlogTagTranslations = z.record(
  z.object({
    name: z.string().nullish(),
  }),
)

export const ZodBlogTag = z.object({
  translations: ZodBlogTagTranslations,
  id: z.number().int(),
  active: z.boolean(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  sortOrder: z.number().nullish(),
  uuid: z.string().uuid(),
})

export const ZodBlogTagQuery = z
  .object({
    id: z.string().nullish(),
    active: z.string().nullish(),
  })
  .merge(ZodOrderingQuery)
  .merge(ZodPaginationQuery)

export const ZodBlogTagParams = z.object({
  id: z.string(),
})

export type BlogTag = z.infer<typeof ZodBlogTag>
