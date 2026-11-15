import * as z from 'zod'

import { BLOG_POST_ORDERINGS, DATA_LIMITS, PRODUCT_ORDERINGS, PRODUCT_STOCK_MODES } from '../constants/builder'
import type { DataRecordKind, DataSource } from '../types/builder'
import { recordId } from './recordId'

/**
 * The descriptors a `query` data setting stores: what to list, never the
 * records themselves. One closed object per source, discriminated on `mode`
 * where a source has two ways to name its records. Every key maps to a
 * filter the Django list endpoint has (`product/filters/product.py`,
 * `blog/filters/post.py`); a filter the API cannot do is not here, and
 * adding one is one entry below plus a shared vector.
 *
 * - `picked`: the merchant's own list. Its order is the merchant's order.
 * - `filter`: a rule. A list key (`categories`) is OR within itself and AND with
 *   the other keys, as the API does it. Product brands and tags, and blog tags,
 *   join when their filters are verified against the running API.
 */
const ids = (max: number) => z.array(recordId()).min(1).max(max)
const limit = (max: number) => z.number().int().min(1).max(max)
const picked = () => z.strictObject({ mode: z.literal('picked'), ids: ids(DATA_LIMITS.maxPickedIds) })

export const DATA_DESCRIPTORS = {
  product: (maxLimit: number) => z.discriminatedUnion('mode', [
    picked(),
    z.strictObject({
      mode: z.literal('filter'),
      categories: ids(DATA_LIMITS.maxFilterIds).optional(),
      ordering: z.enum(PRODUCT_ORDERINGS),
      stock: z.enum(PRODUCT_STOCK_MODES).optional(),
      limit: limit(maxLimit),
    }),
  ]),
  blogPost: (maxLimit: number) => z.discriminatedUnion('mode', [
    picked(),
    z.strictObject({
      mode: z.literal('filter'),
      category: recordId().optional(),
      featured: z.boolean().optional(),
      ordering: z.enum(BLOG_POST_ORDERINGS),
      limit: limit(maxLimit),
    }),
  ]),
  category: (maxLimit: number) => z.discriminatedUnion('mode', [
    z.strictObject({ mode: z.literal('roots'), limit: limit(maxLimit) }),
    z.strictObject({ mode: z.literal('children'), parent: recordId(), limit: limit(maxLimit) }),
  ]),
  blogCategory: (maxLimit: number) => z.strictObject({ limit: limit(maxLimit) }),
  promotion: (maxLimit: number) => z.strictObject({ limit: limit(maxLimit) }),
} as const satisfies Record<DataSource, (maxLimit: number) => z.ZodType>

/** A descriptor of `Source`, as a document stores it. */
export type DataDescriptor<Source extends DataSource> = z.input<ReturnType<(typeof DATA_DESCRIPTORS)[Source]>>

/** The record kind a source lists, for the sources whose records are read by id too (a hand-picked list); a promotion has none. */
export const QUERY_RECORD_KIND: Partial<Record<DataSource, DataRecordKind>> = {
  product: 'product',
  blogPost: 'blogPost',
  category: 'category',
  blogCategory: 'blogCategory',
}
