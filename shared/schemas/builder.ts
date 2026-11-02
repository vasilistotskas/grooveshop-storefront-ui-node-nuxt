import { z } from 'zod'

/** `GET /api/builder/catalogue`: the store's design (schema) to list the blocks of. */
export const ZodBuilderCatalogueQuery = z.object({
  schema: ZodTextSchema.optional(),
})

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

/**
 * `GET builder/link-targets`: the current slug of each record a link names, by
 * kind and id. A slug does not vary by language. A record that is missing,
 * inactive or deleted is absent: the same rule `BuilderReference` checks on
 * publish, so a link to it is left out of the page instead of broken.
 */
export const ZodBuilderLinkTargets = z.object({
  product: z.record(z.string(), z.string()).optional(),
  category: z.record(z.string(), z.string()).optional(),
  blogPost: z.record(z.string(), z.string()).optional(),
  blogCategory: z.record(z.string(), z.string()).optional(),
})
