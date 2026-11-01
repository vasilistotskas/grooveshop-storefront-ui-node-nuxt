import * as z from 'zod'

import type { BuilderDocumentKind, DocumentRoot } from '../types/builder'

/**
 * A page's search-engine copy, written per language: the length limits are
 * the model's (`SeoTranslationModel`), so a save the editor accepts is one
 * the database does. Every field is optional; an empty page has none.
 */
const SEO_ROOT: DocumentRoot = {
  schema: z.object({
    seoTitle: z.string().max(70).optional(),
    seoDescription: z.string().max(300).optional(),
    seoKeywords: z.string().max(255).optional(),
  }),
  translatable: ['/seoTitle', '/seoDescription', '/seoKeywords'],
}

/**
 * What each kind of document carries at its root. A kind not listed has no
 * root settings, and Django refuses a `settings` key on it.
 */
export const BUILDER_DOCUMENT_ROOTS: Partial<Record<BuilderDocumentKind, DocumentRoot>> = {
  page: SEO_ROOT,
  template: SEO_ROOT,
}
