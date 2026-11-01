import { z } from 'zod'
import { BUILDER_NODE_ID_PATTERN } from '../constants/builder'

/** `GET /api/builder/catalogue`: the store's design (schema) to list the blocks of. */
export const ZodBuilderCatalogueQuery = z.object({
  schema: ZodTextSchema.optional(),
})

const zLegacyTranslation = z.object({
  title: z.string().optional(),
  props: z.record(z.string(), z.unknown()).optional(),
})

/**
 * `POST /api/builder/convert-legacy`: a `page_config` layout as Django stores
 * it. `props` and their translations keep their stored snake_case keys, which
 * is why they are opaque here; the request's own keys are camelCase.
 */
export const ZodBuilderConvertLegacyBody = z.object({
  schema: ZodTextSchema.optional(),
  kind: z.enum(['template', 'page']),
  key: z.string().min(1).max(128),
  defaultLocale: z.string().min(2).max(15),
  legacy: z.object({
    pageType: z.string().optional(),
    title: z.string().optional(),
    seo: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
    sections: z.array(z.object({
      id: z.string().regex(BUILDER_NODE_ID_PATTERN),
      type: z.string(),
      title: z.string().default(''),
      isVisible: z.boolean(),
      props: z.record(z.string(), z.unknown()).default({}),
      i18n: z.record(z.string(), zLegacyTranslation).optional(),
    })).max(200),
  }),
})
