import * as z from 'zod'

import { BLOG_POST_ORDERINGS, DATA_LIMITS, PRODUCT_ORDERINGS } from '../constants/builder'
import type { DataSource } from '../types/builder'
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
 * - `filter`: a rule. A list key (`categories`, `brands`, `tags`) is OR within
 *   itself and AND with the other keys, as the API does it.
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
      brands: ids(DATA_LIMITS.maxFilterIds).optional(),
      tags: ids(DATA_LIMITS.maxFilterIds).optional(),
      ordering: z.enum(PRODUCT_ORDERINGS),
      limit: limit(maxLimit),
    }),
  ]),
  blogPost: (maxLimit: number) => z.discriminatedUnion('mode', [
    picked(),
    z.strictObject({
      mode: z.literal('filter'),
      category: recordId().optional(),
      tags: ids(DATA_LIMITS.maxFilterIds).optional(),
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
