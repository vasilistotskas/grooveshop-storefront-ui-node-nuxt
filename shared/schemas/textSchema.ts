import { z } from 'zod'

/**
 * A store's schema name as the text routes take it: an identifier, as a
 * database schema is, and no more. The value only picks one of the
 * catalogue's views, and a name the build has no view for means the
 * default one, so nothing else about it is checked.
 */
export const ZodTextSchema = z.string().regex(/^[A-Za-z_]\w{0,62}$/)

/** `GET /api/texts/catalogue`: the store whose texts to list; without it, every text of the build. */
export const ZodTextCatalogueQuery = z.object({
  schema: ZodTextSchema.optional(),
})
