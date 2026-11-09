/**
 * The store's RSS feeds (`RSS_FEED_PATHS`, `shared/constants/feeds.ts`),
 * built here for `server/handlers/rss-feed.ts`.
 *
 * **Freshness.** Every cached read is a function named `rss:<what>`, with
 * `swr: false`: Nitro gives a stored entry a TTL only without `swr`, and
 * with it an expired entry is served as it is, without an age limit, while
 * the refresh runs in the background (nitropack `runtime/internal/cache`).
 * Two nested SWR reads left the feed two builds behind Django, which on a
 * feed few readers ask for was hours. Django's `sitemap_seo` surface purges
 * `cache:nitro:functions:rss*` whenever a post, product, category or content
 * page changes or goes live (`core/cache/surfaces.py`, `core/publication.py`),
 * so the TTL only bounds a purge that did not arrive.
 *
 * **The edge.** A feed carries the store's Cache-Tag (`edgeCacheHeaders`),
 * so the purge Django queues after the same changes clears Cloudflare's
 * copy too; Cloudflare's "storefront pages" rule caches these paths and
 * follows the origin's headers.
 */
import RSS from 'rss'
import { createError, setHeaders } from 'h3'
import type { H3Event } from 'h3'
import { DEFAULT_LOCALE } from '~~/i18n/locales'
import type { SupportedLocale } from '~~/i18n/locales'
import { defineCachedFunction } from 'nitropack/runtime'
import { useRuntimeConfig } from 'nuxt/server'

/** How long a feed's reads are kept when no purge reaches them. */
export const RSS_CACHE_SECONDS = 5 * 60

// The thumbnail each feed item carries (`<img>`, media:content, enclosure).
const RSS_IMAGE_VARIANT: MediaStreamVariant = {
  width: 472,
  height: 311,
  fit: 'cover',
  position: 'attention',
  background: 'transparent',
  trimThreshold: 0,
  quality: 100,
  format: 'webp',
}

/** The type of what the item's image URL serves: the rendition, not the upload. */
const RSS_IMAGE_TYPE = getMimeType(`image.${RSS_IMAGE_VARIANT.format}`)

// Casts below: @hey-api/openapi-ts's zod plugin marks OpenAPI `readOnly`
// array properties (here, `children`) as `.readonly()`, so the zod-inferred
// type has `readonly X[]`; the typescript plugin instead marks the
// *property* readonly and keeps the array itself mutable. The two
// generated artifacts disagree structurally on this one point — the value
// is identical at runtime, so the cast is safe.
const cachedBlogCategory = defineCachedFunction(
  async (tenantKey: string, locale: string, url: string): Promise<BlogCategoryDetail> => {
    // The store and language the entry is keyed by: a cached function
    // revalidates with no request of its own.
    const raw = await backendFetchFor({ tenantHost: tenantKey, locale })(url, { method: 'GET' })
    return await parseDataAs(raw, zBlogCategoryDetail) as BlogCategoryDetail
  },
  {
    maxAge: RSS_CACHE_SECONDS,
    swr: false,
    name: 'rss:blog-category',
    getKey: (tenantKey: string, locale: string, url: string) => `${tenantKey}:${locale}:${url}`,
  },
)

// The feed carries each article in full, which the list a card is drawn
// from no longer does: Django serves the feed's posts, newest first, with
// their bodies, from its own endpoint.
const cachedBlogPostFeed = defineCachedFunction(
  async (tenantKey: string, locale: string, url: string) => {
    const raw = await backendFetchFor({ tenantHost: tenantKey, locale })(url, { method: 'GET' })
    return await parseDataAs(raw, zListBlogPostFeedResponse)
  },
  {
    maxAge: RSS_CACHE_SECONDS,
    swr: false,
    name: 'rss:blog-posts',
    getKey: (tenantKey: string, locale: string, url: string) => `${tenantKey}:${locale}:${url}`,
  },
)

const cachedProductCategoryDetail = defineCachedFunction(
  async (tenantKey: string, locale: string, url: string): Promise<ProductCategoryDetail> => {
    const raw = await backendFetchFor({ tenantHost: tenantKey, locale })(url, { method: 'GET' })
    return await parseDataAs(raw, zProductCategoryDetail) as ProductCategoryDetail
  },
  {
    maxAge: RSS_CACHE_SECONDS,
    swr: false,
    name: 'rss:product-category',
    getKey: (tenantKey: string, locale: string, url: string) => `${tenantKey}:${locale}:${url}`,
  },
)

const cachedProducts = createCachedFetcher<ProductCard>('rss:products', RSS_CACHE_SECONDS)

/** What one feed is built from: the store, its language and its addresses. */
interface RssFeedSource {
  kind: RssFeedKind
  tenantKey: string
  /** The store's tenant-config epoch: a settings change (logo, asset host) moves it. */
  epoch: string
  locale: SupportedLocale
  siteUrl: string
  siteName: string
  siteDescription: string
  baseUrl: string
  apiBaseUrl: string
  mediaStreamPath: string
  currency: string
  logoImageUrl: string | undefined
  withProducts: boolean
}

const generateRssFeed = defineCachedFunction(
  async (source: RssFeedSource): Promise<string> => {
    const { kind, tenantKey, locale, siteUrl, baseUrl, apiBaseUrl, mediaStreamPath } = source
    const feed = new RSS({
      title: source.siteName,
      description: source.siteDescription,
      site_url: `${siteUrl}${localizedPath(locale, kind === 'blog' ? '/blog' : '/')}`.replace(/\/$/, ''),
      feed_url: `${siteUrl}${localizedPath(locale, RSS_FEED_PATHS[kind])}`,
      language: locale,
      pubDate: new Date().toISOString(),
      // Tenant logo, falling back to the platform screenshot ONLY for the
      // platform's own storefront (a tenant on another domain has no
      // ``/screenshots/**`` asset — that URL would just 404). Omitted
      // entirely (rss package skips falsy fields) when neither is present.
      ...(source.logoImageUrl ? { image_url: source.logoImageUrl } : {}),
      ttl: RSS_CACHE_SECONDS / 60,
      custom_namespaces: {
        media: 'http://search.yahoo.com/mrss/',
        atom: 'http://www.w3.org/2005/Atom',
        dc: 'http://purl.org/dc/elements/1.1/',
        product: 'http://www.buy.com/rss/module/productV2/',
      },
    })

    // The blog feed never asks for products, and a store without the
    // catalogue has none to syndicate: Django refuses the list.
    const [blogPosts, allProducts] = await Promise.all([
      cachedBlogPostFeed(tenantKey, locale, `${apiBaseUrl}/blog/post/feed`),
      source.withProducts
        ? cachedProducts(tenantKey, locale, `${apiBaseUrl}/product`)
        : Promise.resolve([]),
    ])

    const activeProducts = allProducts.filter(product => product.active !== false)

    const blogItems = await processBlogPosts(blogPosts, locale, baseUrl, apiBaseUrl, mediaStreamPath, tenantKey)
    const productItems = await processProducts(activeProducts, locale, baseUrl, apiBaseUrl, mediaStreamPath, tenantKey, source.currency)

    const allItems = [...blogItems, ...productItems].sort(
      (a, b) => {
        const dateA = a.date instanceof Date ? a.date : new Date(a.date)
        const dateB = b.date instanceof Date ? b.date : new Date(b.date)
        return dateB.getTime() - dateA.getTime()
      },
    )

    for (const item of allItems) {
      feed.item(item)
    }

    return feed.xml({ indent: true })
  },
  {
    name: 'rss:feed',
    maxAge: RSS_CACHE_SECONDS,
    swr: false,
    getKey: (source: RssFeedSource) =>
      `${source.tenantKey}:${source.locale}:${source.kind}:${source.currency}:${source.withProducts ? 'catalogue' : 'blog'}:e${source.epoch}`,
  },
)

/**
 * Answer one feed for the request's store, in the language of its path:
 * `/rss.xml` in the default language, `/<locale>/rss.xml` in a language
 * the store serves (`pathLocale`, the route's `[locale]` param). 404 for a
 * language the store does not serve, and when its blog is off (both feeds
 * are blog feeds first), with no work done and nothing a cache may keep.
 * Every other failure is a logged generic 500.
 */
export async function respondWithRssFeed(
  event: H3Event,
  kind: RssFeedKind,
  pathLocale?: string,
): Promise<string> {
  const locale = requestLocale(event)
  const unservedLanguage = pathLocale !== undefined
    && (pathLocale === DEFAULT_LOCALE || pathLocale !== locale)
  if (unservedLanguage || !eventStoreFeature(event, 'blog')) {
    setHeaders(event, { 'Cache-Control': PRIVATE_CACHE_CONTROL })
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  try {
    const config = useRuntimeConfig()
    const siteConfig = getSiteConfig(event)
    // Prefer the tenant's primary domain for the public URLs in feed items —
    // falls back to the build-time NUXT_PUBLIC_BASE_URL when tenant context
    // is missing (e.g. during prerender).
    // The store's host: it keys the cached fetchers and names the store
    // to Django (X-Forwarded-Host).
    const host = requestTenantHost(event)
    const tenant = event.context.tenant
    const tenantDomain = tenant?.primaryDomain || host
    const baseUrl = tenantDomain ? `https://${tenantDomain}` : config.public.baseUrl

    // Whether this IS the platform's own storefront — gates the
    // platform-only ``/screenshots/**`` fallback asset below, which does
    // not exist on another tenant's origin.
    const logoImageUrl = tenant?.logoLightUrl
      || (isPlatformTenantConfig(tenant) ? `${siteConfig.url}/screenshots/1024x593.png` : undefined)

    const feed = await generateRssFeed({
      kind,
      tenantKey: host,
      epoch: tenantConfigEpoch(host),
      locale,
      siteUrl: siteConfig.url,
      siteName: siteConfig.name,
      siteDescription: siteConfig.description,
      baseUrl,
      apiBaseUrl: config.apiBaseUrl,
      // Feed image URLs (media:content / enclosure) must point at THIS
      // tenant's own asset host, not the platform media host baked into
      // NUXT_MEDIA_STREAM_PATH — otherwise a second tenant's feed serves
      // its images from the platform origin. Same resolution as
      // useMediaStreamBaseUrl() on the client.
      mediaStreamPath: mediaStreamBaseUrl(tenant?.assetsDomain, config.mediaStreamPath as string | undefined),
      currency: tenant?.defaultCurrency ?? 'EUR',
      logoImageUrl,
      withProducts: kind === 'store' && eventStoreFeature(event, 'catalogue'),
    })

    setHeaders(event, {
      'Content-Type': 'application/rss+xml; charset=UTF-8',
      ...(tenant ? edgeCacheHeaders(tenant.schemaName) : {}),
    })

    return feed
  }
  catch (error) {
    // Django unreachable, a response that fails its schema, anything:
    // the reader gets one generic failure, the log gets the cause.
    log.error({ action: 'rss:generate', feed: kind, error })
    setHeaders(event, { 'Cache-Control': PRIVATE_CACHE_CONTROL })
    throw createError({ statusCode: 500, statusMessage: 'Failed to generate RSS feed' })
  }
}

async function processBlogPosts(
  blogPosts: BlogPostFeed[],
  locale: SupportedLocale,
  baseUrl: string,
  apiBaseUrl: string,
  mediaStreamPath: string,
  tenantKey: string,
): Promise<RSS.ItemOptions[]> {
  const items: RSS.ItemOptions[] = []

  // Pre-fetch all unique category IDs in parallel
  const uniqueCategoryIds = [...new Set(blogPosts.map(p => p.category).filter(Boolean))]
  const categoryResults = await Promise.allSettled(
    uniqueCategoryIds.map(id => cachedBlogCategory(tenantKey, locale, `${apiBaseUrl}/blog/category/${id}`)),
  )
  const categoryMap = new Map(
    uniqueCategoryIds.map((id, i) => {
      const result = categoryResults[i]
      return [id, result?.status === 'fulfilled' ? result.value : null]
    }),
  )

  for (const post of blogPosts) {
    const translation = post.translations?.[locale] || Object.values(post.translations || {})[0]

    if (!translation) {
      log.warn('rss', `Post with ID ${post.id} has no translations available.`)
      continue
    }

    const mainImageUrl = post.mainImagePath
      ? buildMediaStreamImageUrl(mediaStreamPath, post.mainImagePath, RSS_IMAGE_VARIANT)
      : ''

    let description = translation.subtitle || ''
    const fullContent = translation.body || ''

    if (mainImageUrl) {
      description = `<img src="${mainImageUrl}" alt="${escapeHtmlAttribute(translation.title || '')}" />\n` + description
    }

    let pubDate = new Date()
    if (post.publishedAt) {
      pubDate = new Date(post.publishedAt)
    }
    else if (post.createdAt) {
      pubDate = new Date(post.createdAt)
    }

    const category = categoryMap.get(post.category)
    const categoryName = category?.translations?.[locale]?.name
    const categories = categoryName ? [categoryName] : []

    const wordCount = fullContent.split(/\s+/).length
    const readingTimeMinutes = Math.max(1, Math.round(wordCount / 200))

    const customElements = [
      ...(mainImageUrl ? [mediaContent(mainImageUrl)] : []),
      { 'media:title': translation.title },
      { 'media:description': translation.subtitle },
      { readingTime: `${readingTimeMinutes} min read` },
      { 'atom:updated': new Date(post.updatedAt).toISOString() },
      ...(fullContent ? [{ 'content:encoded': { _cdata: fullContent } }] : []),
    ]

    items.push({
      title: translation.title || 'Untitled Post',
      url: baseUrl + localizedPath(locale, `/blog/post/${post.id}/${post.slug}`),
      description,
      date: pubDate,
      guid: post.uuid || post.id.toString(),
      categories,
      enclosure: mainImageUrl ? { url: mainImageUrl, type: RSS_IMAGE_TYPE } : undefined,
      custom_elements: customElements,
    })
  }

  return items
}

async function processProducts(
  products: ProductCard[],
  locale: SupportedLocale,
  baseUrl: string,
  apiBaseUrl: string,
  mediaStreamPath: string,
  tenantKey: string,
  currency: string,
): Promise<RSS.ItemOptions[]> {
  const items: RSS.ItemOptions[] = []

  // Pre-fetch all unique category IDs in parallel
  const uniqueCategoryIds = [...new Set(products.map(p => p.category).filter(id => id !== null))]
  const categoryResults = await Promise.allSettled(
    uniqueCategoryIds.map(id => cachedProductCategoryDetail(tenantKey, locale, `${apiBaseUrl}/product/category/${id}`)),
  )
  const categoryMap = new Map(
    uniqueCategoryIds.map((id, i) => {
      const result = categoryResults[i]
      return [id, result?.status === 'fulfilled' ? result.value : null]
    }),
  )

  for (const product of products) {
    const translation = product.translations?.[locale] || Object.values(product.translations || {})[0]

    if (!translation) {
      log.warn('rss', `Product with ID ${product.id} has no translations available.`)
      continue
    }

    const mainImageUrl = product.mainImagePath
      ? buildMediaStreamImageUrl(mediaStreamPath, product.mainImagePath, RSS_IMAGE_VARIANT)
      : ''

    let description = translation.description || translation.name || ''
    if (mainImageUrl) {
      description = `<img src="${mainImageUrl}" alt="${escapeHtmlAttribute(translation.name || '')}" />\n` + description
    }

    const pubDate = new Date(product.createdAt)

    const categories: string[] = []
    if (product.category) {
      const category = categoryMap.get(product.category)
      const categoryTranslation = category?.translations?.[locale]
      if (categoryTranslation?.name) {
        categories.push(categoryTranslation.name)
      }
    }

    const customElements: Array<Record<string, unknown>> = [
      { 'atom:updated': new Date(product.updatedAt).toISOString() },
      { 'product:price': productCurrentPrice(product) },
      { 'product:currency': currency },
    ]

    if (mainImageUrl) {
      customElements.push(mediaContent(mainImageUrl))
      customElements.push({ 'media:title': translation.name })
    }

    // A reduction is announced only with its Omnibus prior price.
    const announcement = productAnnouncement(product)
    if (announcement) {
      customElements.push({ 'product:discount': `${announcement.percent}%` })
      customElements.push({ 'product:originalPrice': announcement.priorPrice })
    }

    if (typeof product.stock === 'number') {
      customElements.push({ 'product:availability': product.stock > 0 ? 'in stock' : 'out of stock' })
    }

    if (product.reviewCount > 0) {
      customElements.push({ 'product:rating': product.reviewAverage })
      customElements.push({ 'product:reviewCount': product.reviewCount })
    }

    items.push({
      title: translation.name || `Product #${product.id}`,
      url: baseUrl + localizedPath(locale, `/products/${product.id}/${product.slug}`),
      description,
      date: pubDate,
      guid: `product-${product.uuid || product.id}`,
      categories,
      enclosure: mainImageUrl ? { url: mainImageUrl, type: RSS_IMAGE_TYPE } : undefined,
      custom_elements: customElements,
    })
  }

  return items
}

function mediaContent(url: string): Record<string, unknown> {
  return {
    'media:content': {
      _attr: {
        url,
        type: RSS_IMAGE_TYPE,
        medium: 'image',
        width: String(RSS_IMAGE_VARIANT.width),
        height: String(RSS_IMAGE_VARIANT.height),
      },
    },
  }
}
