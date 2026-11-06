import { defineCachedFunction } from 'nitropack/runtime'
import { useRuntimeConfig } from 'nuxt/server'
import type { z } from 'zod'

import { hashedCacheKey } from '../cacheKey'
import { blogCategoryQuery, blogPostQuery, categoryQuery, idQueries, mediaQueries, productQuery, promotionLimit } from './queries'
import type { DjangoQuery } from './queries'

/** The store and language a read is for: a cached function has no request, so both travel as arguments and key the entry. */
export interface LoaderContext {
  tenantHost: string
  locale: string
  /** The editor's preview alone (`BuilderReadOptions`): the media loader then reads any asset of the library, uncached. */
  staffHeaders?: Readonly<Record<string, string>>
  /** A share link alone (`BuilderReadOptions`): the media loader then reads the assets the link's documents use, uncached. */
  shareToken?: string
}

/**
 * The key of a cached read of the page's data: the store, the language, the
 * store's tenant-config epoch and what was asked. The store is its own `:`
 * segment (a cached function's key is not escaped), which is what
 * `cacheKeyBelongsToHost` scopes a store's purge by, and the epoch is what
 * lets a feature switch orphan every entry of the store at once.
 */
export function dataCacheKey(tenantHost: string, locale: string, asked: string): string {
  return hashedCacheKey(`${tenantHost}:${locale}:e${tenantConfigEpoch(tenantHost)}:${asked}`)
}

/**
 * One read of a Django list endpoint, cached under what it asked.
 *
 * The key is the store, the language, the store's tenant-config epoch and
 * the query itself (keys sorted), so two descriptors that come to one
 * question share an entry and no entry can serve another store or language.
 * The host is its own `:` segment (a cached function's key is not escaped),
 * which is what `cacheKeyBelongsToHost` scopes a store's purge by.
 *
 * `swr: false` with a `maxAge` is what gives the stored entry a TTL (Nitro
 * sets one only without `swr`), so an entry leaves storage instead of
 * outliving its usefulness. The age is short because the entries hold
 * prices. A read that throws is not stored.
 */
export function cachedRead<Schema extends z.ZodType>(
  name: string,
  path: string,
  schema: Schema,
  { localized = true, localeKey = 'languageCode' }: { localized?: boolean, localeKey?: string } = {},
) {
  return defineCachedFunction(
    async (tenantHost: string, locale: string, query: DjangoQuery): Promise<z.output<Schema>> => {
      const response = await backendFetchFor({ tenantHost, locale })(`${useRuntimeConfig().apiBaseUrl}${path}`, {
        method: 'GET',
        query: localized ? { ...query, [localeKey]: locale } : query,
      })
      return parseDataAs(response, schema)
    },
    {
      name,
      maxAge: DATA_CACHE_SECONDS,
      swr: false,
      getKey: (tenantHost: string, locale: string, query: DjangoQuery) =>
        dataCacheKey(tenantHost, locale, JSON.stringify(Object.entries(query).sort(([a], [b]) => a < b ? -1 : 1))),
    },
  )
}

// The cache names are a contract with Django's purge (`core/cache/surfaces.py`).
const readProducts = cachedRead('builderDataProduct', '/product', zListProductResponse)
const readBlogPosts = cachedRead('builderDataBlogPost', '/blog/post', zListBlogPostResponse)
const readCategories = cachedRead('builderDataCategory', '/product/category', zListProductCategoryResponse)
const readBlogCategories = cachedRead('builderDataBlogCategory', '/blog/category', zListBlogCategoryResponse)
const readPromotions = cachedRead('builderDataPromotion', '/promotion', zListPublicPromotionsResponse)
// Django names the language of the alt text `locale` here, and serves only the assets a release uses.
export const readMedia = cachedRead('builderDataMedia', '/builder/media/resolve', zApiV1BuilderMediaResolveRetrieveResponse, { localeKey: 'locale' })

/**
 * The editor's preview reads any asset of the library
 * (`GET builder/media/staff-resolve`), so a draft shows an image nobody has
 * published. It is NEVER cached: the answer is for one staff member, and
 * under the public entry's name it would hand an unpublished image to the
 * next visitor. Only a preview passes the credentials (`BuilderReadOptions`).
 */
/**
 * A share link reads the assets its frozen documents point at
 * (`GET builder/preview-media/<token>`), so a draft shows an image nobody has
 * published and the token opens nothing else of the library. Never cached, as
 * the route around it is not: a revoked link must stop answering.
 */
async function readSharedMedia({ tenantHost, locale, shareToken }: LoaderContext, query: DjangoQuery) {
  const response = await backendFetchFor({ tenantHost, locale })(
    `${useRuntimeConfig().apiBaseUrl}/builder/preview-media/${shareToken}`,
    { method: 'GET', query: { ...query, locale } },
  )
  return parseDataAs(response, zApiV1BuilderPreviewMediaRetrieveResponse)
}

async function readStaffMedia({ tenantHost, locale, staffHeaders }: LoaderContext, query: DjangoQuery) {
  const response = await backendFetchFor({ tenantHost, locale, ...(staffHeaders && { headers: { ...staffHeaders } }) })(
    `${useRuntimeConfig().apiBaseUrl}/builder/media/staff-resolve`,
    { method: 'GET', query: { ...query, locale } },
  )
  return parseDataAs(response, zApiV1BuilderMediaStaffResolveRetrieveResponse)
}

/** The slugs of the records a page links to (`GET builder/link-targets`): they do not vary by language, so the call carries none. */
export const readLinkSlugs = cachedRead('builderDataSlug', '/builder/link-targets', zApiV1BuilderLinkTargetsRetrieveResponse, { localized: false })

/** Every id in as few reads as Django's page size allows, the answers in one list. */
async function readByIds<Item>(
  read: (query: DjangoQuery) => Promise<{ results: Item[] }>,
  ids: readonly number[],
  queries: (ids: readonly number[]) => DjangoQuery[] = idQueries,
): Promise<Item[]> {
  const pages = await Promise.all(queries(ids).map(read))
  return pages.flatMap(page => page.results)
}

/**
 * What the resolver reads by id, one loader per kind: the records the store
 * serves among `ids` (an id it does not serve is simply absent), in no
 * particular order. The answers are the generated types, parsed with the
 * generated schemas, as the storefront's own routes do.
 */
export const RECORD_LOADERS: { [Kind in DataRecordKind]: (context: LoaderContext, ids: readonly number[]) => Promise<DataRecords[Kind][]> } = {
  product: ({ tenantHost, locale }, ids) => readByIds(query => readProducts(tenantHost, locale, query), ids),
  blogPost: ({ tenantHost, locale }, ids) => readByIds(query => readBlogPosts(tenantHost, locale, query), ids),
  category: ({ tenantHost, locale }, ids) => readByIds(query => readCategories(tenantHost, locale, query), ids),
  blogCategory: ({ tenantHost, locale }, ids) => readByIds(query => readBlogCategories(tenantHost, locale, query), ids),
  media: (context, ids) => readByIds(
    (query) => {
      if (context.staffHeaders) return readStaffMedia(context, query)
      if (context.shareToken) return readSharedMedia(context, query)
      return readMedia(context.tenantHost, context.locale, query)
    },
    ids,
    mediaQueries,
  ),
}

const answerOf = <Item>({ results, count }: { results: Item[], count: number }): QueryAnswer<Item> => ({ items: results, total: count })

/**
 * What the resolver reads by descriptor, one loader per source: the items the
 * descriptor lists now, in the order Django answers them, and how many match
 * in all.
 */
export const QUERY_LOADERS: { [Source in DataSource]: (context: LoaderContext, descriptor: unknown) => Promise<QueryAnswer<DataItems[Source]>> } = {
  product: async ({ tenantHost, locale }, descriptor) => answerOf(await readProducts(tenantHost, locale, productQuery(descriptor))),
  blogPost: async ({ tenantHost, locale }, descriptor) => answerOf(await readBlogPosts(tenantHost, locale, blogPostQuery(descriptor))),
  category: async ({ tenantHost, locale }, descriptor) => {
    const query = categoryQuery(descriptor)
    const answer = answerOf(await readCategories(tenantHost, locale, query))
    // A catalogue hung under ONE root offers no choice at its top level: the
    // band would draw a single tile whose only job is to open the tree. Its
    // children are what the merchant means by "shop by category", so they are
    // listed instead; with two or more roots the roots are the choice.
    const [only] = answer.items
    if (query.isRoot !== true || answer.total !== 1 || !only) return answer
    const children = answerOf(await readCategories(tenantHost, locale, { parent: only.id, pageSize: query.pageSize ?? DATA_LIMITS.maxQueryLimit }))
    return children.items.length > 0 ? children : answer
  },
  blogCategory: async ({ tenantHost, locale }, descriptor) => answerOf(await readBlogCategories(tenantHost, locale, blogCategoryQuery(descriptor))),
  // The offers endpoint has no page size: every live offer, of which the descriptor keeps the first.
  promotion: async ({ tenantHost, locale }, descriptor) => {
    const offers = await readPromotions(tenantHost, locale, {})
    return { items: offers.slice(0, promotionLimit(descriptor)), total: offers.length }
  },
}
