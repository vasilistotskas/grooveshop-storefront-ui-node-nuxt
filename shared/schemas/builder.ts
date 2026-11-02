import { z } from 'zod'

/** `GET /api/builder/catalogue`: the store's design (schema) to list the blocks of. */
export const ZodBuilderCatalogueQuery = z.object({
  schema: ZodTextSchema.optional(),
})

/** The page key of `GET /api/builder/pages/<key>`: a slug, as Django's route takes it. */
export const ZodBuilderPageParams = z.object({
  pageKey: z.string().regex(/^[-\w]{1,64}$/),
})
