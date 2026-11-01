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
const zConvertLayout = z.object({
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

const zLabels = z.record(z.string(), z.string())

const zMenuLink = z.object({
  id: z.string().regex(BUILDER_NODE_ID_PATTERN).optional(),
  labels: zLabels,
  icon: z.string().optional(),
  target: z.discriminatedUnion('type', [
    z.object({ type: z.literal('content_page'), slug: z.string() }),
    z.object({ type: z.literal('page_layout'), pageType: z.string() }),
    z.object({ type: z.literal('route'), route: z.string() }),
    z.object({ type: z.literal('url'), href: z.string() }),
  ]),
})

/** A navigation menu as Django stores it: a footer's columns, or the links of the header or the mobile menu. */
const zConvertMenu = z.object({
  schema: ZodTextSchema.optional(),
  kind: z.literal('group'),
  key: z.string().min(1).max(128),
  defaultLocale: z.string().min(2).max(15),
  legacy: z.object({
    id: z.string().regex(BUILDER_NODE_ID_PATTERN).optional(),
    slot: z.enum(['header', 'footer', 'mobile']),
    columns: z.array(z.object({
      id: z.string().regex(BUILDER_NODE_ID_PATTERN).optional(),
      labels: zLabels,
      icon: z.string().optional(),
      showsMerchantIdentity: z.boolean().optional(),
      links: z.array(zMenuLink).max(100),
    })).max(20).optional(),
    links: z.array(zMenuLink).max(100).optional(),
  }),
})

/** `POST /api/builder/convert-legacy`: a layout (`kind` template or page) or a menu (`kind` group). */
export const ZodBuilderConvertLegacyBody = z.union([zConvertLayout, zConvertMenu])

/** The page key of `GET /api/builder/pages/<key>`: a slug, as Django's route takes it. */
export const ZodBuilderPageParams = z.object({
  pageKey: z.string().regex(/^[-\w]{1,64}$/),
})

/** What Django's published read answers: the release and the resolved page; the theme and the groups are read where they are used. */
export const ZodBuilderPublished = z.object({
  release: z.number().int(),
  locale: z.string(),
  page: z.unknown(),
})

/**
 * What Django's page-less published read answers (`GET builder/published`):
 * the release's section groups and the list of its pages. The page itself,
 * the theme and every document's content are read where they are used.
 */
export const ZodBuilderPublishedSummary = z.object({
  release: z.number().int(),
  groups: z.record(z.string(), z.unknown()),
  pages: z.array(z.object({
    key: z.string().regex(/^[-\w]{1,64}$/),
    kind: z.enum(['template', 'page']),
    updatedAt: z.iso.datetime({ offset: true }),
  })),
})
