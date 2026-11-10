import { useRuntimeConfig } from 'nuxt/server'
import type { RequestEvent } from 'nuxt/server'

/**
 * The store's own sitemap URLs: its blog posts and categories, products
 * and categories, content pages and custom pages.
 * `server/plugins/sitemap-store-urls.ts` adds them to the sitemap as an
 * in-process source, inside the `/sitemap.xml` request, so a read that
 * failed is known there (`complete: false`). As an HTTP source it was
 * lost inside @nuxtjs/sitemap, which builds the sitemap without a failed
 * source's URLs and answers 200, and the `/sitemap.xml` route rule then
 * kept that sitemap for a day.
 */

const SITEMAP_CACHE_AGE = 60 * 60

// Hoisted to module scope so ``defineCachedFunction`` registers each
// fetcher exactly once — calling ``createCachedFetcher`` inside the
// handler meant every sitemap request re-registered the same name
// into Nitro's cache registry (harmless, but wasteful + fragile).
// Callers pass the request host and locale for per-tenant,
// per-language cache scoping.
//
// Stale-serving (`swr: true`): the sitemap is rebuilt once a day
// (`/sitemap.xml`'s route rule), and a rebuild during a Django outage
// would otherwise drop the store's pages from it for that day. Freshness
// comes from Django's purge: its `sitemap_seo` surface removes these
// entries when a post, product, category or content page changes or goes
// live.
const cachedBlogPosts = createCachedFetcher<BlogPost>(
  'sitemap:blog-posts',
  SITEMAP_CACHE_AGE,
  { swr: true },
)
const cachedBlogCategories = createCachedFetcher<BlogCategory>(
  'sitemap:blog-categories',
  SITEMAP_CACHE_AGE,
  { swr: true },
)
const cachedProducts = createCachedFetcher<ProductCard>(
  'sitemap:products',
  SITEMAP_CACHE_AGE,
  { swr: true },
)
const cachedProductCategories = createCachedFetcher<ProductCategory>(
  'sitemap:product-categories',
  SITEMAP_CACHE_AGE,
  { swr: true },
)
// Published ContentPages — the merchant's own policy pages. These were
// the one indexable surface the sitemap never listed: static routes come
// from the build-time route manifest and dynamic ones from the fetchers
// above, and `/info/<slug>` is neither, so a merchant could publish a
// returns policy and Google would never be told it exists.
const cachedContentPages = createCachedFetcher<ContentPage>(
  'sitemap:content-pages',
  SITEMAP_CACHE_AGE,
  { swr: true },
)

export interface StoreSitemapUrls {
  urls: ReturnType<typeof asSitemapUrl>[]
  /** False when a read failed and its URLs are missing from `urls`. */
  complete: boolean
}

export async function storeSitemapUrls(event: RequestEvent): Promise<StoreSitemapUrls> {
  const config = useRuntimeConfig()
  const host = requestTenantHost(event)
  const locale = requestLocale(event)

  // `/sitemap.xml` is bypassed in server/middleware/0.tenant.ts, so
  // `event.context.tenant` may be unset here. Resolve the store
  // ourselves; none (404, no host) falls back to the platform-wide
  // behaviour below.
  const tenant = (await requestTenantResult(event)).config

  // Use the tenant's primary domain for public URLs so the sitemap reflects
  // the requesting tenant (not the single NUXT_PUBLIC_BASE_URL build-time value).
  const tenantDomain = tenant?.primaryDomain || host
  const baseUrl = tenantDomain ? `https://${tenantDomain}` : config.public.baseUrl
  const apiBaseUrl = config.apiBaseUrl

  // Sitemap <image:loc> URLs must point at THIS tenant's own asset host,
  // not the platform media host baked into NUXT_PUBLIC_MEDIA_STREAM_PATH —
  // the path segment is fixed, only the origin is per-tenant (assetsDomain).
  // Falls back to the platform path when there's no tenant context (the
  // build/SWR case this route is normally hit in). Mirrors the RSS feed and
  // useMediaStreamBaseUrl() resolution.
  const mediaStreamBase = mediaStreamBaseUrl(tenant?.assetsDomain, config.public.mediaStreamPath as string | undefined)

  const blogEnabled = storeFeatureOn(tenant, 'blog')
  // A store can hold a product model and serve no shop (an engineering
  // contractor quoting per project). Its listings and product pages 404 under
  // `app/middleware/catalogue-enabled.ts`, so they must not be
  // advertised here either.
  const catalogueEnabled = storeFeatureOn(tenant, 'catalogue')

  // Fetch all data in parallel for better performance — tenant host
  // is passed so each tenant's sitemap has its own cache entry.
  // languageCode ensures Django returns translations for the active locale.
  // Blog data is skipped entirely when the blog feature is off so disabled
  // tenants don't leak blog URL surface in the sitemap. A read that fails
  // (a cold cache during a Django outage; a warm one serves its last good
  // list) lists nothing and makes the result incomplete.
  let complete = true
  const settled = <T>(read: Promise<T[]>): Promise<T[]> => read.catch((error: unknown) => {
    complete = false
    log.warn({
      tag: 'sitemap',
      message: 'Sitemap read failed; its URLs are left out',
      host,
      error: error instanceof Error ? error.message : String(error),
    })
    return []
  })
  const [
    allPosts,
    allBlogCategories,
    allProducts,
    allProductCategories,
    allContentPages,
    publishedPages,
  ] = await Promise.all([
    blogEnabled
      ? settled(cachedBlogPosts(host, locale, `${apiBaseUrl}/blog/post?languageCode=${locale}`))
      : Promise.resolve([]),
    blogEnabled
      ? settled(cachedBlogCategories(host, locale, `${apiBaseUrl}/blog/category?languageCode=${locale}`))
      : Promise.resolve([]),
    catalogueEnabled
      ? settled(cachedProducts(host, locale, `${apiBaseUrl}/product?languageCode=${locale}`))
      : Promise.resolve([]),
    catalogueEnabled
      ? settled(cachedProductCategories(host, locale, `${apiBaseUrl}/product/category?languageCode=${locale}`))
      : Promise.resolve([]),
    // Ungated: a content page is published or it is not, and the API
    // returns only published rows to an anonymous caller. pageSize is
    // explicit because the endpoint's default page is 12 — a store with
    // more policy pages than that would have silently listed a subset.
    settled(cachedContentPages(
      host,
      locale,
      `${apiBaseUrl}/content-page?languageCode=${locale}&pageSize=100`,
    )),
    // A store's own layouts: there are none without one. Fails closed
    // (`null`, logged there), so a failed read lists no custom page.
    tenant ? publishedPagesForHost(host, apiBaseUrl) : Promise.resolve(null),
  ])
  if (tenant && publishedPages === null) complete = false

  const urls = [
    // Blog categories — omitted when blog is disabled for this tenant
    ...allBlogCategories.map(category => asSitemapUrl({
      loc: baseUrl + '/blog/category/' + category.id + '/' + category.slug,
      changefreq: 'weekly',
      priority: 0.5,
      lastmod: new Date(category.updatedAt),
    })),
    // Blog posts — omitted when blog is disabled for this tenant
    ...allPosts.map(post => asSitemapUrl({
      loc: baseUrl + '/blog/post/' + post.id + '/' + post.slug,
      changefreq: 'daily',
      priority: 0.8,
      lastmod: new Date(post.updatedAt),
    })),
    // Product categories (lower priority than products)
    ...allProductCategories.map(category => asSitemapUrl({
      loc: baseUrl + '/products/category/' + category.id + '/' + category.slug,
      changefreq: 'weekly',
      priority: 0.6,
      lastmod: new Date(category.updatedAt),
    })),
    // Content pages, minus the ones a dedicated legal route already
    // serves. `/info/terms` and `/terms-of-use` render the same
    // document, and `/info/[slug]` 301s to the canonical route — so
    // listing both would put a redirect in the sitemap and advertise two
    // addresses for one page. Same map the redirect and the footer read.
    //
    // The canonical legal routes are NOT emitted here. They come from
    // static route discovery and are gated per tenant in
    // `server/plugins/sitemap-tenant-gate.ts`, which drops the ones
    // whose ContentPage that tenant has not published. Emitting them
    // here as well would hand the module two entries for one `loc`.
    ...allContentPages
      .filter(page => !LEGAL_ROUTE_BY_SLUG.has(page.slug))
      .map(page => asSitemapUrl({
        loc: baseUrl + '/info/' + page.slug,
        changefreq: 'monthly',
        priority: 0.4,
        lastmod: new Date(page.updatedAt),
      })),
    // Custom pages: every published page no static route renders, at
    // `/<key>` where the catch-all serves it. They were in no
    // store's sitemap. The path, not `baseUrl`: `_i18nTransform`
    // expands it into the locale variants and their hreflang set, as
    // for the static routes, and the tenant gate then keeps only the
    // locales the store serves.
    ...(publishedPages ?? [])
      .filter(page => isCustomPageSlug(page.key))
      .map(page => asSitemapUrl({
        loc: `/${page.key}`,
        changefreq: 'weekly',
        priority: 0.7,
        lastmod: new Date(page.updatedAt),
        _i18nTransform: true,
      })),
    // Products (highest priority for e-commerce)
    ...allProducts.map(product => asSitemapUrl({
      loc: baseUrl + '/products/' + product.id + '/' + product.slug,
      changefreq: 'daily',
      priority: 0.9,
      lastmod: new Date(product.updatedAt),
      images: product.mainImagePath
        ? [{
            loc: buildMediaStreamImageUrl(mediaStreamBase, product.mainImagePath, SEARCH_IMAGE_VARIANT),
            // The request locale's translation, as the data was read in
            // it; any other locale's name so the field is never empty.
            title: product.translations?.[locale]?.name
              || Object.values(product.translations ?? {}).find(t => t?.name)?.name
              || undefined,
            // The description's readable text as the caption, cut at 160
            // characters to keep the sitemap lean; the module XML-escapes it.
            caption: htmlToPlainText(product.translations?.[locale]?.description ?? '').slice(0, 160) || undefined,
          }]
        : undefined,
    })),
  ]
  return { urls, complete }
}
