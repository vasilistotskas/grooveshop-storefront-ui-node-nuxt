import { z } from 'zod'

/** `GET /api/builder/catalogue`: the store's design (schema) to list the blocks of. */
export const ZodBuilderCatalogueQuery = z.object({
  schema: ZodTextSchema.optional(),
})
