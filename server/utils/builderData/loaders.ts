import { defineCachedFunction } from 'nitropack/runtime'
import { useRuntimeConfig } from 'nuxt/server'
import type { z } from 'zod'

import { hashedCacheKey } from '../cacheKey'
import { blogCategoryQuery, blogPostQuery, categoryQuery, idQueries, productQuery, promotionLimit } from './queries'
import type { DjangoQuery } from './queries'

/** The store and language a read is for: a cached function has no request, so both travel as arguments and key the entry. */
export interface LoaderContext {
  tenantHost: string
  locale: string
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
  { localized = true }: { localized?: boolean } = {},
) {
  return defineCachedFunction(
    async (tenantHost: string, locale: string, query: DjangoQuery): Promise<z.output<Schema>> => {
      const response = await backendFetchFor({ tenantHost, locale })(`${useRuntimeConfig().apiBaseUrl}${path}`, {
        method: 'GET',
        query: localized ? { ...query, languageCode: locale } : query,
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

/** The slugs of the records a page links to (`GET builder/link-targets`): they do not vary by language, so the call carries none. */
export const readLinkSlugs = cachedRead('builderDataSlug', '/builder/link-targets', zApiV1BuilderLinkTargetsRetrieveResponse, { localized: false })

/** Every id in as few reads as Django's page size allows, the answers in one list. */
async function readByIds<Item>(
  read: (query: DjangoQuery) => Promise<{ results: Item[] }>,
  ids: readonly number[],
): Promise<Item[]> {
  const pages = await Promise.all(idQueries(ids).map(read))
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
}

/** What the resolver reads by descriptor, one loader per source: the items the descriptor lists now, in the order Django answers them. */
export const QUERY_LOADERS: { [Source in DataSource]: (context: LoaderContext, descriptor: unknown) => Promise<DataItems[Source][]> } = {
  product: async ({ tenantHost, locale }, descriptor) => (await readProducts(tenantHost, locale, productQuery(descriptor))).results,
  blogPost: async ({ tenantHost, locale }, descriptor) => (await readBlogPosts(tenantHost, locale, blogPostQuery(descriptor))).results,
  category: async ({ tenantHost, locale }, descriptor) => (await readCategories(tenantHost, locale, categoryQuery(descriptor))).results,
  blogCategory: async ({ tenantHost, locale }, descriptor) => (await readBlogCategories(tenantHost, locale, blogCategoryQuery(descriptor))).results,
  promotion: async ({ tenantHost, locale }, descriptor) => (await readPromotions(tenantHost, locale, {})).slice(0, promotionLimit(descriptor)),
}
