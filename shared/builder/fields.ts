import * as z from 'zod'

import { LINK_ROUTES, LINK_SCHEMA_MARKER } from '../constants/builder'

/**
 * The setting shapes the builder's blocks share, the constraints
 * `page_config`'s section schemas have always set: a length, a link
 * (see `link`), a `#rrggbb` colour, a surface from a fixed
 * list. A block takes them from here, so one rule has one definition.
 *
 * No `.default()` anywhere: a block's parse returns what was stored and
 * nothing more, so the section component fills its own defaults.
 */
const text = (max: number) => z.string().max(max)

const httpsUrl = () => z.string().max(1000).regex(/^https:\/\//)
const recordId = () => z.number().int().min(1).max(2_147_483_647)

/**
 * A link names WHERE it goes and never a typed internal path, so it cannot go
 * stale: an external `https://` URL, one of the fixed routes that point at no
 * record, or a record (resolved to its current address when a page is read).
 * The marker lets `defineBlock` list every link setting of a block, so Django
 * checks and indexes the records they name (`linkRefs`).
 */
const link = () => z.union([
  z.strictObject({ href: httpsUrl() }),
  z.strictObject({ route: z.enum(LINK_ROUTES) }),
  z.strictObject({
    ref: z.discriminatedUnion('kind', [
      z.strictObject({ kind: z.literal('product'), id: recordId() }),
      z.strictObject({ kind: z.literal('category'), id: recordId() }),
      z.strictObject({ kind: z.literal('blogCategory'), id: recordId() }),
      z.strictObject({ kind: z.literal('blogPost'), id: recordId() }),
      z.strictObject({ kind: z.literal('page'), id: z.string().min(1).max(64) }),
      z.strictObject({ kind: z.literal('contentPage'), id: z.string().min(1).max(64).regex(/^[-a-zA-Z0-9_]+$/) }),
    ]),
  }),
]).meta({ [LINK_SCHEMA_MARKER]: true })

/** The settings a rail of products shares, the three bands of `products_*` over: `ordering` is what makes two rails on one page different. */
function productRail(maxPageSize: number) {
  return {
    surface: z.enum(['default', 'muted']).optional(),
    heading: text(200).optional(),
    subheading: text(500).optional(),
    ctaText: text(100).optional(),
    ctaLink: link().optional(),
    ordering: z.enum(['featured', 'newest', 'popular', 'discounted', 'rating']).optional(),
    categoryId: z.number().int().min(1).max(2_147_483_647).optional(),
    showAddToCart: z.boolean().optional(),
    pageSize: z.number().int().min(1).max(maxPageSize).optional(),
  }
}

/** The settings of a band of blog posts, whatever its count is called. */
function blogRail() {
  return {
    surface: z.enum(['default', 'muted']).optional(),
    heading: text(200).optional(),
    subheading: text(500).optional(),
    ctaText: text(100).optional(),
    ctaLink: link().optional(),
    categoryId: z.number().int().min(1).max(2_147_483_647).optional(),
  }
}

export const builderField = {
  productRail,
  blogRail,
  text,
  /** Present and non-empty. */
  requiredText: (max: number) => z.string().min(1).max(max),
  integer: (min: number, max: number) => z.number().int().min(min).max(max),
  number: (min: number, max: number) => z.number().min(min).max(max),
  link,
  httpsUrl,
  /** An icon name of the icon sets, `i-<set>:<name>`. */
  icon: (max?: number) => (max === undefined ? z.string() : z.string().max(max)).regex(/^i-[a-z0-9:-]+$/),
  hexColor: () => z.string().regex(/^#[0-9a-fA-F]{6}$/),
  /** An id of a record in the store: a positive integer. */
  id: recordId,
  /** Which of the two page grounds a band paints. */
  surface: () => z.enum(['default', 'muted']),
  /** A band that may also be drawn dark. */
  inkSurface: () => z.enum(['default', 'muted', 'ink']),
  boolean: () => z.boolean(),
  /** Text the sanitiser lets keep its markup: Django sanitises it on save and the storefront on render. */
  richText: (max: number) => z.string().max(max).meta({ contentMediaType: 'text/html' }),
}
