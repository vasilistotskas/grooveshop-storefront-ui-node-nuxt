import * as z from 'zod'

/**
 * The setting shapes the builder's blocks share, the constraints
 * `page_config`'s section schemas have always set: a length, a link that
 * is a path or `https://`, a `#rrggbb` colour, a surface from a fixed
 * list. A block takes them from here, so one rule has one definition.
 *
 * No `.default()` anywhere: a block's parse returns what was stored and
 * nothing more, so the section component fills its own defaults.
 */
const text = (max: number) => z.string().max(max)

const LINK_PATTERN = /^(\/|https:\/\/)/

/** The settings a rail of products shares, the three bands of `products_*` over: `ordering` is what makes two rails on one page different. */
function productRail(maxPageSize: number) {
  return {
    surface: z.enum(['default', 'muted']).optional(),
    heading: text(200).optional(),
    subheading: text(500).optional(),
    ctaText: text(100).optional(),
    ctaLink: z.string().max(1000).regex(LINK_PATTERN).optional(),
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
    ctaLink: z.string().max(1000).regex(LINK_PATTERN).optional(),
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
  /** An internal path or an `https://` URL. */
  link: () => z.string().max(1000).regex(LINK_PATTERN),
  httpsUrl: () => z.string().max(1000).regex(/^https:\/\//),
  /** An icon name of the icon sets, `i-<set>:<name>`. */
  icon: (max?: number) => (max === undefined ? z.string() : z.string().max(max)).regex(/^i-[a-z0-9:-]+$/),
  hexColor: () => z.string().regex(/^#[0-9a-fA-F]{6}$/),
  /** An id of a record in the store: a positive integer. */
  id: () => z.number().int().min(1).max(2_147_483_647),
  /** Which of the two page grounds a band paints. */
  surface: () => z.enum(['default', 'muted']),
  /** A band that may also be drawn dark. */
  inkSurface: () => z.enum(['default', 'muted', 'ink']),
  boolean: () => z.boolean(),
  /** Text the sanitiser lets keep its markup: Django sanitises it on save and the storefront on render. */
  richText: (max: number) => z.string().max(max).meta({ contentMediaType: 'text/html' }),
}
