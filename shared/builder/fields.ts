import * as z from 'zod'

import { BLOCK_REF_KINDS, DATA_LIMITS, DATA_SCHEMA_MARKER, LINK_ROUTES, LINK_SCHEMA_MARKER } from '../constants/builder'
import type { BlockRefKind, DataDeclaration, DataMissing, DataSource } from '../types/builder'
import { DATA_DESCRIPTORS } from './dataSources'
import { recordId } from './recordId'

/**
 * The setting shapes the builder's blocks share: a length, a link
 * (see `link`), a `#rrggbb` colour, a surface from a fixed
 * list. A block takes them from here, so one rule has one definition.
 *
 * No `.default()` anywhere: a block's parse returns what was stored and
 * nothing more, so the section component fills its own defaults.
 */
const text = (max: number) => z.string().max(max)

/**
 * The patterns of the shared text formats. Exported so the editor can tell
 * which control a setting needs from its JSON Schema `pattern`, which is
 * exactly one of these, rather than guess from a setting's name.
 */
export const BUILDER_FIELD_PATTERNS = {
  httpsUrl: /^https:\/\//,
  icon: /^i-[a-z0-9:-]+$/,
  hexColor: /^#[0-9a-fA-F]{6}$/,
} as const

const httpsUrl = () => z.string().max(1000).regex(BUILDER_FIELD_PATTERNS.httpsUrl)

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

/**
 * A setting that names ONE record by id (`ref`) and what the page does when
 * the record is gone: `hide` leaves the node that holds it out, `empty` hands
 * its component a `missing` status to draw its own empty state. A page and a
 * content page are named by their key; every other kind by a numeric id.
 * The marker lets `defineBlock` list every data setting of a block (`data`),
 * so Django checks the record exists and the storefront resolves it.
 */
function ref(kind: BlockRefKind, { onMissing }: { onMissing: DataMissing }) {
  if (!BLOCK_REF_KINDS.includes(kind)) {
    throw new Error(`builderField.ref: "${kind}" is not a record kind`)
  }
  const value = kind === 'page' || kind === 'contentPage' ? z.string().min(1).max(64) : recordId()
  const declaration: DataDeclaration = { field: 'ref', kind, onMissing }
  return value.meta({ [DATA_SCHEMA_MARKER]: declaration })
}

/**
 * A setting that stores a DESCRIPTOR: what to list from `source` (`DATA_DESCRIPTORS`),
 * never the records, which the storefront resolves when the page is read.
 * `maxLimit` narrows how many records the list may return (at most the
 * source's cap); `onEmpty` is what the page does with a list that matches
 * nothing, as `ref`'s `onMissing`.
 */
function query(source: DataSource, { onEmpty, maxLimit = DATA_LIMITS.maxQueryLimit }: { onEmpty: DataMissing, maxLimit?: number }) {
  if (!Number.isInteger(maxLimit) || maxLimit < 1 || maxLimit > DATA_LIMITS.maxQueryLimit) {
    throw new Error(`builderField.query: maxLimit must be an integer from 1 to ${DATA_LIMITS.maxQueryLimit}`)
  }
  const declaration: DataDeclaration = { field: 'query', source, onEmpty, maxLimit }
  return DATA_DESCRIPTORS[source](maxLimit).meta({ [DATA_SCHEMA_MARKER]: declaration })
}

/**
 * The settings a rail of products shares, the three bands of `products_*` over.
 * What it lists is its `products` (a rule or a hand-picked list), and the rule's
 * order is what makes two rails on one page different.
 */
function productRail(maxLimit: number) {
  return {
    surface: z.enum(['default', 'muted']).optional(),
    heading: text(200).optional(),
    subheading: text(500).optional(),
    ctaText: text(100).optional(),
    ctaLink: link().optional(),
    showAddToCart: z.boolean().optional(),
    products: query('product', { onEmpty: 'hide', maxLimit }),
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
  ref,
  query,
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
  icon: (max?: number) => (max === undefined ? z.string() : z.string().max(max)).regex(BUILDER_FIELD_PATTERNS.icon),
  hexColor: () => z.string().regex(BUILDER_FIELD_PATTERNS.hexColor),
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
