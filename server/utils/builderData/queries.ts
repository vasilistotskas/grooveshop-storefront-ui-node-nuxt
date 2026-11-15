import type { z } from 'zod'

/**
 * A descriptor as the question to put to Django: the query string of the
 * list endpoint that answers it. What Django is asked is also what the read
 * is cached under (`cachedRead`), so two descriptors that come to one
 * question share one entry.
 *
 * Each key of a descriptor maps to a filter or an ordering the endpoint has;
 * `product/views/product.py` declares the product orderings, and
 * `blog/views/post.py` the blog's. The query string is camelCase, as the
 * generated query schemas state it (`id_In` is how Django's camel-case parser
 * spells `id__in`).
 */
export type DjangoQuery = Readonly<Record<string, string | number | boolean>>

const PRODUCT_ORDER_BY = {
  newest: '-createdAt',
  mostViewed: '-viewCount',
  mostLiked: '-likesCount',
  topRated: '-reviewAverage',
  discounted: '-announcedDiscountPercent',
  priceAsc: 'effectivePrice',
  priceDesc: '-effectivePrice',
} as const satisfies Record<ProductOrdering, string>

const parseDescriptor = <Schema extends z.ZodType>(schema: Schema, descriptor: unknown): z.output<Schema> =>
  schema.parse(descriptor)

/** The ids once each and sorted, in groups of at most `size`: the same set is the same questions. */
function idChunks(ids: readonly number[], size: number): number[][] {
  const sorted = [...new Set(ids)].sort((a, b) => a - b)
  const chunks: number[][] = []
  for (let from = 0; from < sorted.length; from += size) chunks.push(sorted.slice(from, from + size))
  return chunks
}

/** Records by id: one read per `DATA_MAX_PAGE_SIZE` ids, the ids sorted so the same set is the same question. */
export function idQueries(ids: readonly number[]): DjangoQuery[] {
  return idChunks(ids, DATA_MAX_PAGE_SIZE).map(chunk => ({ id_In: chunk.join(','), pageSize: chunk.length }))
}

/** Assets by id: one read per `DATA_MEDIA_MAX_IDS` ids, which is all Django's resolve answers. */
export function mediaQueries(ids: readonly number[]): DjangoQuery[] {
  return idChunks(ids, DATA_MEDIA_MAX_IDS).map(chunk => ({ ids: chunk.join(',') }))
}

export function productQuery(descriptor: unknown): DjangoQuery {
  const parsed = parseDescriptor(DATA_DESCRIPTORS.product(DATA_LIMITS.maxQueryLimit), descriptor)
  if (parsed.mode === 'picked') throw new Error('A hand-picked list is read by id, not by query')
  const orderBy = PRODUCT_ORDER_BY[parsed.ordering]
  return {
    pageSize: parsed.limit,
    // The API takes a comma-separated ordering: the products on sale ahead of the rest, then the merchant's order.
    ordering: parsed.stock === 'inStockFirst' ? `-availabilityPriority,${orderBy}` : orderBy,
    ...(parsed.stock === 'inStockOnly' && { inStock: true }),
    // Django's `category` filter takes ids joined by `_` and includes every descendant.
    ...(parsed.categories && { category: [...new Set(parsed.categories)].sort((a, b) => a - b).join('_') }),
    ...(parsed.ordering === 'discounted' && { minAnnouncedDiscountPercent: 1 }),
  }
}

export function blogPostQuery(descriptor: unknown): DjangoQuery {
  const parsed = parseDescriptor(DATA_DESCRIPTORS.blogPost(DATA_LIMITS.maxQueryLimit), descriptor)
  if (parsed.mode === 'picked') throw new Error('A hand-picked list is read by id, not by query')
  return blogPostListQuery(parsed)
}

export function categoryQuery(descriptor: unknown): DjangoQuery {
  const parsed = parseDescriptor(DATA_DESCRIPTORS.category(DATA_LIMITS.maxQueryLimit), descriptor)
  return parsed.mode === 'roots'
    ? { isRoot: true, pageSize: parsed.limit }
    : { parent: parsed.parent, pageSize: parsed.limit }
}

export function blogCategoryQuery(descriptor: unknown): DjangoQuery {
  return { pageSize: parseDescriptor(DATA_DESCRIPTORS.blogCategory(DATA_LIMITS.maxQueryLimit), descriptor).limit }
}

/** The promotions endpoint has no filter and no page size: every live offer, of which the descriptor keeps the first `limit`. */
export function promotionLimit(descriptor: unknown): number {
  return parseDescriptor(DATA_DESCRIPTORS.promotion(DATA_LIMITS.maxQueryLimit), descriptor).limit
}
